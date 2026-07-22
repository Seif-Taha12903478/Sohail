#ifndef SENSOR_CONTROL_H
#define SENSOR_CONTROL_H

#include <Arduino.h>

#define LDR_PIN 34
#define TEMP_PIN 35

#define MODE_NORMAL 1
#define MODE_FAST   2
#define MODE_STANDBY 3

struct Reading {
  float temp;
  int light;
  int mode;
  unsigned long ts;
};

class SensorControl {
public:
  SensorControl() : _mode(MODE_NORMAL), _sampleRate(1000), _lastSample(0), _hasReading(false) {
    _reading = {0.0f, 0, MODE_NORMAL, 0};
  }

  void begin() {
    pinMode(LDR_PIN, INPUT);
    pinMode(TEMP_PIN, INPUT);
  }

  void update() {
    if (_mode == MODE_STANDBY) return;
    if (millis() - _lastSample >= _sampleRate) {
      _lastSample = millis();
      int rawTemp = analogRead(TEMP_PIN);
      int rawLight = analogRead(LDR_PIN);
      _reading.temp = (rawTemp / 4095.0f) * 50.0f;
      _reading.light = map(rawLight, 0, 4095, 0, 1000);
      _reading.mode = _mode;
      _reading.ts = millis();
      _hasReading = true;
    }
  }

  Reading getLatestReading() { return _reading; }

  bool hasNewReading() {
    bool r = _hasReading;
    _hasReading = false;
    return r;
  }

  void setMode(int m) {
    if (m >= MODE_NORMAL && m <= MODE_STANDBY) _mode = m;
  }

  int getMode() { return _mode; }

  void setSampleRate(unsigned long ms) {
    if (ms >= 100 && ms <= 60000) _sampleRate = ms;
  }

  unsigned long getSampleRate() { return _sampleRate; }

private:
  int _mode;
  unsigned long _sampleRate;
  unsigned long _lastSample;
  Reading _reading;
  bool _hasReading;
};

#endif
