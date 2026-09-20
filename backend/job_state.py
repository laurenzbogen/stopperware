import json
import asyncio
import threading
import traceback

from fastapi import HTTPException


class JobState:
    def __init__(self):
        self._lock = threading.RLock()
        self._watcher = None
        self._reset_state()

    def _reset_state(self):
        self._session_id = None
        self._calculation_type = None
        self._process = None
        self._progress = 0
        self._progress_message = ""
        self._errored = False
        self._error_message = None

    def is_idle(self):
        with self._lock:
            return self._process is None

    def is_errored(self):
        with self._lock:
            return self._errored

    def is_blocking_to_session(self, session_id_or_null):
        with self._lock:
            if self._process is None:
                if self._session_id is not None:
                    raise AssertionError(
                        "Process is none, but Job State is not initialized!"
                    )
                return False
            return self._session_id != session_id_or_null

    def try_cancel_process(self):
        with self._lock:
            if self._process is not None and self._process.returncode is None:
                self._process.terminate()

    async def start_or_attach(self, dependency, session_id, worker):
        if self.is_idle():
            try:
                await self.try_start_process(dependency, session_id, worker)
            except:
                # TODO
                pass
        else:
            print('Attaching to running calculation')

    async def try_start_process(self, dependency, session_id, worker):
        process = await asyncio.create_subprocess_exec(
            "python",
            worker,
            session_id,
            stdout=asyncio.subprocess.PIPE,
        )
        with self._lock:
            self._process = process
            self._session_id = session_id
            self._calculation_type = dependency
            self._watcher = asyncio.create_task(self.watch_process(process))


    async def watch_process(self, process):
        try:
            while True:
                line = await process.stdout.readline()
                print(line)
                if not line:
                    break
                self.update_from_line(line)
        finally:
            await process.wait()
            with self._lock:
                if self._process is process:
                    if process.returncode != 0:
                        self._errored = True
                        self._error_message = f"Worker exited with code {process.returncode}"

    def update_from_line(self, line):
        try:
            new_state = json.loads(line)
        except json.JSONDecodeError:
            return
        with self._lock:
            try:
                if self._process is None:
                    raise AssertionError('Got a process update line while no process was defined in job_state')
                self._session_id = new_state.get("session_id", self._session_id)
                self._calculation_type = new_state.get("calculation_type", self._calculation_type)
                self._progress = new_state.get("progress", self._progress)
                self._progress_message = new_state.get(
                    "progress_message", self._progress_message
                )
                self._errored = new_state.get("errored", self._errored)
                self._error_message = new_state.get(
                    "error_message", self._error_message
                )
            except:
                self._errored = True
                self._error_message = (
                    f"Error updating server state from subprocess pipe text, {traceback.format_exc()}"
                )

    def reset(self, session_id):
        with self._lock:
            if self._session_id is not None and self._session_id != session_id:
                raise AssertionError("Session Ids dont match on Server Job Reset call")
            self._reset_state()

    def serialize_job_state(self, session_id):
        if self.is_blocking_to_session(session_id):
            return {
                "status": "JOB_BLOCKING",
                "message": "Running ob belongs to different session",
            }

        status_message = "JOB_RUNNING" if not self._errored else "JOB_ERRORED"
        return {
            "status": status_message,
            "type": self._calculation_type,
            "progress": self._progress,
            "progressMessage": self._progress_message,
            "errored": self._errored,
            "errorMessage": self._error_message,
        }

    def test_function(self):
        with self._lock:
            self._session_id = "sessionid123"
