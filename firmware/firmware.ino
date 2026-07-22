/*
 * Environmental Monitoring IoT Node — Week 4 (Arduino Uno / Wokwi)
 * Owner: Abijith (sensor & control) + Seif (telemetry & comms)
 */

#include "sensor_control.h"
#include "telemetry_comms.h"

SensorControl sensor;
TelemetryComms comms(&sensor);

void setup() {
  sensor.begin();
  comms.begin(115200);
  Serial.println("BOOT:Environmental Monitoring Node v1.0");
  Serial.println("MODE=1 RATE=1000");
}

void loop() {
  sensor.update();
  comms.update();
  comms.sendTelemetry();
}
