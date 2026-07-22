#ifndef TELEMETRY_COMMS_H
#define TELEMETRY_COMMS_H

#include <Arduino.h>
#include "sensor_control.h"

#define MAX_CMD_LEN 64

class TelemetryComms {
public:
  TelemetryComms(SensorControl* sensor) : _sensor(sensor), _cmdIndex(0) {}

  void begin(unsigned long baud = 115200) {
    Serial.begin(baud);
    memset(_cmdBuffer, 0, MAX_CMD_LEN);
  }

  void update() { processSerial(); }

  void sendTelemetry() {
    if (!_sensor->hasNewReading()) return;
    Reading r = _sensor->getLatestReading();
    char frame[80];
    snprintf(frame, sizeof(frame), "<T:%.1f,L:%d,MODE:%d>", r.temp, r.light, r.mode);
    Serial.println(frame);
  }

  void sendStatus() {
    Reading r = _sensor->getLatestReading();
    char status[96];
    snprintf(status, sizeof(status), "MODE=%d RATE=%lu T=%.1f L=%d",
      _sensor->getMode(), (unsigned long)_sensor->getSampleRate(), r.temp, r.light);
    Serial.println(status);
  }

private:
  SensorControl* _sensor;
  char _cmdBuffer[MAX_CMD_LEN];
  int _cmdIndex;

  void processSerial() {
    while (Serial.available()) {
      char c = Serial.read();
      if (c == '\n' || c == '\r') {
        if (_cmdIndex > 0) {
          _cmdBuffer[_cmdIndex] = '\0';
          parseCommand(_cmdBuffer);
          _cmdIndex = 0;
          memset(_cmdBuffer, 0, MAX_CMD_LEN);
        }
      } else {
        if (_cmdIndex < MAX_CMD_LEN - 1) {
          _cmdBuffer[_cmdIndex++] = c;
        } else {
          _cmdIndex = 0;
          memset(_cmdBuffer, 0, MAX_CMD_LEN);
          Serial.println("ERR:OVERFLOW");
        }
      }
    }
  }

  void parseCommand(const char* cmd) {
    if (strncmp(cmd, "MODE=", 5) == 0) {
      int m = atoi(cmd + 5);
      if (m >= 1 && m <= 3) { _sensor->setMode(m); Serial.print("ACK:MODE="); Serial.println(m); }
      else Serial.println("ERR:RANGE");
    } else if (strncmp(cmd, "RATE=", 5) == 0) {
      unsigned long rate = (unsigned long)atol(cmd + 5);
      if (rate >= 100 && rate <= 60000) { _sensor->setSampleRate(rate); Serial.print("ACK:RATE="); Serial.println(rate); }
      else Serial.println("ERR:RANGE");
    } else if (strcmp(cmd, "STATUS?") == 0) {
      sendStatus();
    } else {
      Serial.println("ERR:UNKNOWN");
    }
  }
};

#endif
