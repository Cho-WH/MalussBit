bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    inputs = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    pins.setPull(DigitalPin.P1, PinPullMode.PullNone)
    pins.setPull(DigitalPin.P2, PinPullMode.PullNone)
    if (inputs == "inTemp") {
        modes = "inTemp"
        basic.showString("t")
    } else if (inputs == "inLight") {
        modes = "inLight"
        basic.showString("L")
    } else if (inputs == "inNoise") {
        modes = "inNoise"
        basic.showString("n")
    } else if (inputs == "inMagnet") {
        modes = "inMagnet"
        basic.showString("n")
    } else if (inputs == "accel") {
        modes = "accel"
        basic.showString("a")
    } else if (inputs == "DS18B20" || inputs == "temp") {
        modes = "DS18B20"
        pins.setPull(DigitalPin.P1, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P2, PinPullMode.PullUp)
        basic.showString("t")
    } else if (inputs == "voltage") {
        modes = "voltage"
        basic.showString("v")
    } else if (inputs.includes("servo")) {
        servo_action()
    } else if (inputs.includes("dust")) {
        modes = "dust"
        basic.showString("d")
    } else if (inputs.includes("BME280")) {
        modes = "BME280"
        basic.showString("B")
    } else if (inputs.includes("SHT20")) {
        modes = "SHT20"
        basic.showString("S")
    } else if (inputs.includes("sonar")) {
        modes = "sonar"
        basic.showString("U")
    } else {
    	
    }
})
bluetooth.onBluetoothConnected(function () {
    연결됨 = 1
    basic.showIcon(IconNames.Yes)
})
bluetooth.onBluetoothDisconnected(function () {
    control.reset()
})
function 이름_출력 () {
    basic.showString(control.deviceName().charAt(0))
    basic.showString(control.deviceName().charAt(1))
    basic.showString(control.deviceName().charAt(2))
    basic.showString(control.deviceName().charAt(3))
    basic.showString(control.deviceName().charAt(4))
    basic.showString(" ")
    basic.showString("v")
    basic.showString("6")
    basic.showString(" ")
}
function Setup () {
    input.setAccelerometerRange(AcceleratorRange.EightG)
    modes = "none"
    연결됨 = 0
    온도1 = input.temperature()
    온도2 = input.temperature()
    서보작동중 = 0
    거리 = 0
    bluetooth.startUartService()
    while (연결됨 == 0) {
        이름_출력()
    }
}
function servo_action () {
    if (서보작동중 == 0) {
        서보작동중 = 1
        서보배열 = inputs.split(",")
        if (서보배열.length == 3) {
            서보1 = parseFloat(서보배열[1])
            서보2 = parseFloat(서보배열[2])
            if (0 <= 서보1 && 서보1 <= 180) {
                servos.P1.setAngle(서보1)
            }
            if (0 <= 서보2 && 서보2 <= 180) {
                servos.P2.setAngle(서보2)
            }
        }
    }
    서보작동중 = 0
}
let 미세먼지 = 0
let 임시2백업 = 0
let 임시2 = 0
let 임시1백업 = 0
let 임시1 = 0
let 서보2 = 0
let 서보1 = 0
let 서보배열: string[] = []
let 거리 = 0
let 서보작동중 = 0
let 온도2 = 0
let 온도1 = 0
let 연결됨 = 0
let modes = ""
let inputs = ""
Setup()
basic.forever(function () {
    if (modes == "inTemp") {
        bluetooth.uartWriteString("" + convertToText(input.temperature()))
    } else if (modes == "inLight") {
        bluetooth.uartWriteString("" + convertToText(input.lightLevel()))
    } else if (modes == "inNoise") {
        bluetooth.uartWriteString("" + convertToText(input.soundLevel()))
    } else if (modes == "inMagnet") {
        bluetooth.uartWriteString("" + convertToText(input.compassHeading()))
    } else if (modes == "accel") {
        bluetooth.uartWriteString("" + convertToText(input.acceleration(Dimension.X)) + "," + convertToText(input.acceleration(Dimension.Y)) + "," + convertToText(input.acceleration(Dimension.Z)) + "," + convertToText(input.acceleration(Dimension.Strength)))
    } else if (modes == "DS18B20") {
        임시1 = Math.round(Environment.Ds18b20Temp(DigitalPin.P1, Environment.ValType.DS18B20_temperature_C) * 10) / 10
        if (-50 < 임시1 && 임시1 < 150) {
            if (Math.abs(임시1 - 임시1백업) < 10) {
                온도1 = 임시1
            }
        }
        임시2 = Math.round(Environment.Ds18b20Temp(DigitalPin.P2, Environment.ValType.DS18B20_temperature_C) * 10) / 10
        if (-50 < 임시2 && 임시2 < 150) {
            if (Math.abs(임시2 - 임시2백업) < 10) {
                온도2 = 임시2
            }
        }
        bluetooth.uartWriteString("" + convertToText(온도1) + "," + convertToText(온도2))
        임시1백업 = 임시1
        임시2백업 = 임시2
    } else if (modes == "voltage") {
        bluetooth.uartWriteString("" + convertToText(pins.analogReadPin(AnalogReadWritePin.P1)) + "," + convertToText(pins.analogReadPin(AnalogReadWritePin.P2)))
    } else if (modes == "BME280") {
        bluetooth.uartWriteLine("" + Environment.octopus_BME280(Environment.BME280_state.BME280_temperature_C) + "," + Environment.octopus_BME280(Environment.BME280_state.BME280_pressure) + "," + Environment.octopus_BME280(Environment.BME280_state.BME280_humidity))
    } else if (modes == "SHT20") {
        bluetooth.uartWriteLine("" + SHT2xDriver.read_temperature() + "," + SHT2xDriver.read_humidity())
    } else if (modes == "sonar") {
        임시1 = sonar.ping(
        DigitalPin.P1,
        DigitalPin.P2,
        PingUnit.Centimeters
        )
        if (0 < 임시1) {
            bluetooth.uartWriteLine("" + 임시1)
        }
    } else {
    	
    }
})
basic.forever(function () {
    if (modes == "dust") {
        pins.digitalWritePin(DigitalPin.P1, 0)
        control.waitMicros(280)
        미세먼지 = pins.analogReadPin(AnalogReadWritePin.P0)
        control.waitMicros(40)
        pins.digitalWritePin(DigitalPin.P1, 1)
        control.waitMicros(960)
        미세먼지 = 미세먼지
        bluetooth.uartWriteString("" + convertToText(미세먼지))
        if (미세먼지 <= 75) {
            pins.digitalWritePin(DigitalPin.P2, 0)
            pins.digitalWritePin(DigitalPin.P8, 0)
            pins.digitalWritePin(DigitalPin.P12, 1)
        } else if (미세먼지 <= 150) {
            pins.digitalWritePin(DigitalPin.P2, 0)
            pins.digitalWritePin(DigitalPin.P8, 1)
            pins.digitalWritePin(DigitalPin.P12, 0)
        } else {
            pins.digitalWritePin(DigitalPin.P2, 1)
            pins.digitalWritePin(DigitalPin.P8, 0)
            pins.digitalWritePin(DigitalPin.P12, 0)
        }
    }
})
