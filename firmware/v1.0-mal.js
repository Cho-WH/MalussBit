bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    uartCommand = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (uartCommand == "SWEEP") {
        performSweep()
    } else if (uartCommand == "RESET" || uartCommand == "STOP") {
        servos.P1.setAngle(SWEEP_START_DEG)
    }
})
function performSweep () {
    servos.P1.setAngle(SWEEP_START_DEG)
    while (angle <= SWEEP_END_DEG) {
        servos.P1.setAngle(angle)
        sendSample(angle)
        basic.pause(SAMPLE_INTERVAL_MS)
    }
    servos.P1.setAngle(SWEEP_START_DEG)
}
function sendSample (angle: number) {
    millis = control.millis()
    bluetooth.uartWriteLine("" + millis + "," + angle + "," + input.lightLevel())
}
function setup () {
    bluetooth.startUartService()
}
let millis = 0
let uartCommand = ""
let angle = 0
let SAMPLE_INTERVAL_MS = 0
let SWEEP_END_DEG = 0
let SWEEP_START_DEG = 0
SWEEP_START_DEG = 0
SWEEP_END_DEG = 180
SAMPLE_INTERVAL_MS = 50
angle = 0
servos.P1.setRange(0, 180)
setup()
