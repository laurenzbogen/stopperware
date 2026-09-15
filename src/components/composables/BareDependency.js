export default class BareDependency {
    constructor(endpoint) {
        this.endpoint = endpoint
        this.requestStatus = REQUEST_STATUS.UNAVAILABLE
        this.progress = 0
        this.progressMessage = ''
        this.errorMessage = ''
        this.data = ''
    }
}
