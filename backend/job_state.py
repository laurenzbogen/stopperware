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
            "session_id": "",
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

    def finish(self, process):
        """Called once the worker process has exited."""
        with self._lock:
            if self._state["process"] is not process:
                return
            if process.returncode == 0:
                self._state = self._default()
            else:
                self._state.update(
                    {
                        "jobStatus": "error",
                        "process": None,
                        "error": self._state.get("error")
                        or f"worker exited with code {process.returncode}",
                    }
                )

    def _heal_stale(self):
        """If state says running but the process is gone, reset."""
        p = self._state["process"]
        if self._state["jobStatus"] == "running" and (
            p is None or p.returncode is not None
        ):
            self._state = self._default()

    def reset(self):
        with self._lock:
            self._state = self._default()

    def getSessionId(self):
        with self._lock:
            return self._state['session_id']

    def getState(self):
        with self._lock:
            self._heal_stale()
            return self.get_job_json()

    def evaluate(self, jobType, session_id):
        with self._lock:
            self._heal_stale()
            status = self._state["jobStatus"]

            # an old error must not block anyone: report it once to its owner, then clear
            if status == "error":
                if (
                    session_id == self._state["session_id"]
                    and jobType == self._state["type"]
                ):
                    message = self.get_job_json()
                    self._state = self._default()
                    message.update({"status_code": 510, "status": "ERROR"})
                    return False, message
                self._state = self._default()
                status = "idle"

            if status == "running":
                if session_id != self._state["session_id"]:
                    raise HTTPException(
                        status_code=466,
                        detail=f"A session is blocking the calculation for {session_id}",
                    )
                if jobType != self._state["type"]:
                    raise HTTPException(
                        status_code=465,
                        detail=f"A different job is running while evaluating {jobType}",
                    )
                message = self.get_job_json()
                message.update({"status_code": 210, "status": "INPROGRESS"})
                return False, message

            message = self.get_job_json()
            message.update({"status_code": 201, "status": "STARTING"})
            return True, message

    def update_from_line(self, line):
        try:
            new_state = json.loads(line)
        except json.JSONDecodeError:
            return
        with self._lock:
            if new_state.get("type") == self._state["type"]:
                new_state.pop("process", None)  # never let the worker overwrite this
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
                    "session_id": h,
                    "progress": 0,
                    "progressMessage": "set in trystart",
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
