const SERVO_PIN = AnalogPin.P1
const HOME_ANGLE = 0
const MIN_ANGLE = 0
const MAX_ANGLE = 180
const MIN_DURATION_MS = 500
const MAX_DURATION_MS = 60000
const SAMPLE_INTERVAL_MS = 50

let isSweeping = false
let startAngle = 0
let endAngle = 0
let durationMs = 0
let sweepStartMs = 0
let lastSampleMs = 0
let lastCommandAt = 0
let lastAngleCommand = HOME_ANGLE

function clampAngle(angle: number) {
    if (angle < MIN_ANGLE) {
        return MIN_ANGLE
    }
    if (angle > MAX_ANGLE) {
        return MAX_ANGLE
    }
    return angle
}

function sendMessage(text: string) {
    bluetooth.uartWriteLine("MSG:" + text)
}

function sendSample(angle: number) {
    bluetooth.uartWriteLine("" + control.millis() + "," + Math.round(angle) + ",," + input.lightLevel())
}

function resetSweepState() {
    isSweeping = false
    lastSampleMs = 0
    sweepStartMs = 0
    durationMs = 0
}

function moveServo(angle: number) {
    const clamped = Math.round(clampAngle(angle))
    pins.servoWritePin(SERVO_PIN, clamped)
    lastAngleCommand = clamped
}

function completeSweep(status: string) {
    if (!isSweeping) {
        if (status === "STOP") {
            sendMessage("STOP_ACK")
        }
        return
    }

    resetSweepState()

    if (status === "COMPLETE") {
        moveServo(endAngle)
        sendMessage("SWEEP_COMPLETE")
    } else if (status === "STOP") {
        moveServo(HOME_ANGLE)
        sendMessage("STOP_ACK")
    } else if (status === "ABORT") {
        moveServo(HOME_ANGLE)
        sendMessage("SWEEP_ABORTED")
    }
}

function beginSweep(startDeg: number, endDeg: number, duration: number) {
    startAngle = clampAngle(startDeg)
    endAngle = clampAngle(endDeg)
    durationMs = Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, duration))
    sweepStartMs = control.millis()
    lastSampleMs = 0
    isSweeping = true
    moveServo(startAngle)
    sendMessage("SWEEP_START")
}

function handleSweepCommand(args: string[]) {
    if (args.length < 4) {
        sendMessage("ERROR_INVALID_SWEEP_ARGS")
        return
    }
    const startDeg = parseFloat(args[1])
    const endDeg = parseFloat(args[2])
    const duration = parseFloat(args[3])

    if (isNaN(startDeg) || isNaN(endDeg) || isNaN(duration)) {
        sendMessage("ERROR_INVALID_SWEEP_ARGS")
        return
    }
    if (duration < MIN_DURATION_MS) {
        sendMessage("ERROR_DURATION_TOO_SHORT")
        return
    }

    if (isSweeping) {
        completeSweep("ABORT")
    }

    beginSweep(startDeg, endDeg, duration)
}

function handleCommand(rawLine: string) {
    const trimmed = rawLine.trim()
    if (trimmed.length === 0) {
        return
    }

    const segments = trimmed.split(",")
    const command = segments[0].toUpperCase()
    lastCommandAt = control.millis()

    if (command === "SWEEP") {
        handleSweepCommand(segments)
    } else if (command === "STOP") {
        completeSweep("STOP")
    } else if (command === "RESET") {
        completeSweep("ABORT")
        sendMessage("RESET_DONE")
    } else {
        sendMessage("ERROR_UNKNOWN_COMMAND")
    }
}

function setup() {
    bluetooth.startUartService()
    moveServo(HOME_ANGLE)
    sendMessage("READY")
}

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    const line = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    handleCommand(line)
})

bluetooth.onBluetoothDisconnected(function () {
    completeSweep("ABORT")
})

setup()

basic.forever(function () {
    if (isSweeping) {
        const now = control.millis()
        const elapsed = now - sweepStartMs
        let progress = elapsed / durationMs
        if (progress >= 1) {
            progress = 1
        }
        const targetAngle = startAngle + (endAngle - startAngle) * progress
        moveServo(targetAngle)
        if (lastSampleMs === 0 || now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
            sendSample(targetAngle)
            lastSampleMs = now
        }
        if (progress >= 1) {
            completeSweep("COMPLETE")
        }
    }
    basic.pause(10)
})
