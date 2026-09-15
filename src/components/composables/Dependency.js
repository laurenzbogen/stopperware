import { fetchApiJson } from "@/helpers"

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

    async fetch() {
        if (this.requestStatus === REQUEST_STATUS.INPROGRESS || this.requestStatus === REQUEST_STATUS.AVAILABLE) {
            return
        }

        this.requestStatus = REQUEST_STATUS.INPROGRESS
        this.progress = 0
        this.errorMessage = ''

        try {
            while (true) {
                const r = await fetchApiJson(this.name)

                if (r.status === 'STARTING' || r.status === 'INPROGRESS') {
                    if (r.progress) this.progress = r.progress
                    if (r.progressMessage) this.progressMessage = r.progressMessage
                    await delay(500)
                    continue
                }

                if (r.status === 'AVAILABLE') {
                    this.data = r.payload
                    this.progress = 1
                    this.requestStatus = REQUEST_STATUS.AVAILABLE
                    return
                }

                throw new Error(r.message || `Unexpected status: ${r.status}`)
            }
        } catch (err) {
            console.error(err)
            this.requestStatus = REQUEST_STATUS.ERRORED
            this.errorMessage = err.message || String(err)
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


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
