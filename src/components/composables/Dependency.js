import { fetchApiJson, delay } from "@/helpers"

export const REQUEST_STATUS = {
    UNAVAILABLE: 'UNAVAILABLE',
    INPROGRESS: 'INPROGRESS',
    AVAILABLE: 'AVAILABLE',
    ERRORED: 'ERRORED',
}

export default class Dependency {
    constructor(name) {
        this.name = name
        this.requestStatus = REQUEST_STATUS.UNAVAILABLE
        this.progress = 0
        this.progressMessage = ''
        this.errorMessage = ''
        this.data = ''
    }

    getData() {
        if (this.requestStatus !== REQUEST_STATUS.AVAILABLE) {
            throw new Error('Attempting to get unready data ', this.name)
        }
        return this.data
    }

    async tryFetch() {
        if (this.requestStatus === REQUEST_STATUS.INPROGRESS || this.requestStatus === REQUEST_STATUS.AVAILABLE) {
            return
        }

        this.requestStatus = REQUEST_STATUS.INPROGRESS
        this.progress = 0
        this.errorMessage = ''

        while (true) {
            let r
            try {
                r = await fetchApiJson(`dependency/${this.name}`)
            } catch (e) {
                throw new Error(`Error calculating ${this.name}, Server Error Status: ${e}`)
            }

            if (r.status === 'JOB_RUNNING' ) {
                if (r.progress) this.progress = r.progress
                if (r.progressMessage) this.progressMessage = r.progressMessage
                await delay(500)
                continue
            }

            if (r.status === 'DEPENDENCY_AVAILABLE') {
                this.data = r.data
                this.requestStatus = REQUEST_STATUS.AVAILABLE
                return
            }

            if (r.status === 'JOB_ERRORED') {
                this.requestStatus = REQUEST_STATUS.ERRORED

                throw new Error(`Error calculating ${this.name}: ${r.errorMessage}`)
            }

            throw new Error(`Error calculating ${this.name}, Unexpected status: ${r.status}`)
        }
    }

    reset() {
        this.requestStatus = REQUEST_STATUS.UNAVAILABLE
        this.progress = 0
        this.progressMessage = ''
        this.errorMessage = ''
        this.data = ''
    }

}


