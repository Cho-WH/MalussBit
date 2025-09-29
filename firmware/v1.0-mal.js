bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    uartCommand = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (uartCommand == "SWEEP") {
        queueSweep()
    } else if (uartCommand == "RESET" || uartCommand == "STOP") {
        handleResetCommand()
    }
})
bluetooth.onBluetoothDisconnected(function () {
    control.reset()
})
function performSweep () {
    if (isSweeping) {
        return
    }
    isSweeping = true
    cancelRequested = false
    angle = SWEEP_START_DEG
    servos.P1.setAngle(SWEEP_START_DEG)
    while (angle <= SWEEP_END_DEG) {
        if (cancelRequested) {
            break
        }
        servos.P1.setAngle(angle)
        sendSample(angle)
        angle += SWEEP_STEP_DEG
        basic.pause(SAMPLE_INTERVAL_MS)
    }
    enterIdleState(true)
}
function sendSample (angle: number) {
    millis = control.millis()
    bluetooth.uartWriteLine("" + millis + "," + angle + "," + convertToText(input.lightLevel()))
}
function queueSweep () {
    if (isSweeping) {
        return
    }
    startSweepRequested = true
}
function handleResetCommand () {
    cancelRequested = true
    startSweepRequested = false
    if (!isSweeping) {
        enterIdleState(true)
    }
}
function enterIdleState (notify: boolean) {
    servos.P1.setAngle(SWEEP_START_DEG)
    angle = SWEEP_START_DEG
    cancelRequested = false
    if (isSweeping) {
        isSweeping = false
    }
    if (notify) {
        bluetooth.uartWriteLine("END")
    }
}
function setup () {
    bluetooth.startUartService()
    angle = SWEEP_START_DEG
    servos.P1.setRange(0, 180)
    control.inBackground(function () {
        while (true) {
            if (startSweepRequested && !isSweeping) {
                startSweepRequested = false
                performSweep()
            }
            basic.pause(10)
        }
    })
}
let millis = 0
let angle = 0
let uartCommand = ""
let SAMPLE_INTERVAL_MS = 0
let SWEEP_END_DEG = 0
let SWEEP_START_DEG = 0
let SWEEP_STEP_DEG = 0
let isSweeping = false
let cancelRequested = false
let startSweepRequested = false
SWEEP_START_DEG = 0
SWEEP_END_DEG = 180
SAMPLE_INTERVAL_MS = 50
SWEEP_STEP_DEG = 1
setup()
