import json
import asyncio
import threading

from fastapi import HTTPException


class JobState:
    def __init__(self):
        self._lock = threading.RLock()
        self._state = self._default()

    def _default(self):
        return {
            "jobStatus": "idle",
            "type": None,
            "session": "",
            "process": None,
            "progress": 0,
            "payload": None,
            "progressMessage": "",
            "error": None,
            "future": None,
        }

    def get_job_json(self):
        exclude = {"process", "future"}
        return {k: v for k, v in self._state.items() if k not in exclude}


    def reset(self):
        with self._lock:
            self._state = self._default()

    def evaluate(self):
        with self._lock:
            status = self._state["jobStatus"]
            message = self.get_job_json()

            # calculate, finished, message
            if status == "running":
                message.update({"status_code": 210, "status": "INPROGRESS"})
                return False, message
            if status == "error":
                message.update({
                    "status_code": 500,
                    "status": "ERROR",
                })
                return False, message

            # status == "idle"
            message.update({"status_code": 201, "status": "STARTING"})
            return True, message

    def update_from_line(self, line):
        try:
            new_state = json.loads(line)
        except json.JSONDecodeError:
            return  # or log and re-raise, depending on how strict you want to be

        with self._lock:
            print(self._state['type'], new_state['type'])
            if new_state['type'] == self._state['type']:
                self._state.update(new_state)

    async def try_start(self, job_type, h, process_name, *args):
        with self._lock:
            if self._state["jobStatus"] != "idle":
                print("already running")
                raise HTTPException(
                    status_code=423,
                    detail=f"job not idle: {self._state}",
                )

            process = await asyncio.create_subprocess_exec(
                "python",
                process_name,
                *args,
                stdout=asyncio.subprocess.PIPE,
            )

            self._state.update(
                {
                    "jobStatus": "running",
                    "type": job_type,
                    "session": h,
                    "progress": 0,
                    "progressMessage": 'set in trystart',
                    "payload": None,
                    "process": process,
                }
            )
            return process

    def get_process_if_running(self):
        with self._lock:
            process = self._state["process"]
            if process is not None and process.returncode is None:
                return process
            return None

    def clear_process(self, expected_process):
        with self._lock:
            if self._state["process"] is expected_process:
                self._state["process"] = None
                self.reset()
            else:
                raise HTTPException(
                    status_code=466,
                    detail=f"Error clearing expected process {expected_process}: {self._state}",
                )

    def check_state_to_request(self, request_type):
        with self._lock:
            if self._state["type"] != request_type and self._state["type"] != None:
                raise HTTPException(
                    status_code=465,
                    detail=f"wrong job type for embedding calculation: {self._state}",
                )
        return True
