/*
 * Environmental Monitoring IoT Node — Week 5+ (ESP32 / Wokwi)
 * Owner: Abijith (sensor & control layer)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#define LDR_PIN 34
#define TEMP_PIN 35
#define MODE_NORMAL  1
#define MODE_FAST    2
#define MODE_STANDBY 3

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883;
const char* DEVICE_ID   = "esp32-001";
const char* TELEMETRY_TOPIC = "device/telemetry";
const char* COMMAND_TOPIC   = "device/commands";

int currentMode = MODE_NORMAL;
unsigned long sampleRate = 1000;
unsigned long lastSample = 0;
float lastTemp = 0.0;
int   lastLight = 0;
bool  hasNewReading = false;

WiFiClient espClient;
PubSubClient client(espClient);

void setMode(int m) { if (m >= 1 && m <= 3) currentMode = m; }
void setSampleRate(unsigned long ms) { if (ms >= 100 && ms <= 60000) sampleRate = ms; }

void sampleSensors() {
  if (currentMode == MODE_STANDBY) return;
  if (millis() - lastSample < sampleRate) return;
  lastSample = millis();
  int rawTemp = analogRead(TEMP_PIN);
  int rawLight = analogRead(LDR_PIN);
  lastTemp = (rawTemp / 4095.0) * 50.0;
  lastLight = map(rawLight, 0, 4095, 0, 1000);
  hasNewReading = true;
}

void publishTelemetry() {
  if (!hasNewReading) return;
  hasNewReading = false;
  StaticJsonDocument<200> doc;
  doc["device_id"] = DEVICE_ID;
  doc["temp"] = round(lastTemp * 10.0) / 10.0;
  doc["light"] = lastLight;
  doc["mode"] = currentMode;
  char payload[200];
  serializeJson(doc, payload, sizeof(payload));
  if (client.publish(TELEMETRY_TOPIC, payload)) {
    Serial.print("Published: "); Serial.println(payload);
  } else {
    Serial.println("Publish failed, will retry");
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  char msg[128];
  int i = 0;
  for (; i < (int)length && i < 127; i++) msg[i] = (char)payload[i];
  msg[i] = '\0';
  Serial.print("Command received: "); Serial.println(msg);
  StaticJsonDocument<128> doc;
  DeserializationError err = deserializeJson(doc, msg);
  if (err) { Serial.println("ERR: malformed JSON"); return; }
  const char* cmd = doc["cmd"];
  if (!cmd) { Serial.println("ERR: missing cmd field"); return; }
  if (strcmp(cmd, "MODE") == 0) {
    int val = doc["value"] | -1;
    if (val >= 1 && val <= 3) { setMode(val); Serial.print("ACK: MODE="); Serial.println(val); }
    else Serial.println("ERR:RANGE");
  } else if (strcmp(cmd, "RATE") == 0) {
    int val = doc["value"] | -1;
    if (val >= 100 && val <= 60000) { setSampleRate((unsigned long)val); Serial.print("ACK: RATE="); Serial.println(val); }
    else Serial.println("ERR:RANGE");
  } else {
    Serial.println("ERR:UNKNOWN");
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(250); Serial.print("."); }
  Serial.println(); Serial.print("Connected! IP: "); Serial.println(WiFi.localIP());
}

void connectMQTT() {
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(callback);
  String clientId = "esp32-"; clientId += String(random(0xffff), HEX);
  Serial.print("Connecting to MQTT broker...");
  while (!client.connected()) {
    if (client.connect(clientId.c_str())) {
      Serial.println(" connected");
      client.subscribe(COMMAND_TOPIC);
      Serial.print("Subscribed to "); Serial.println(COMMAND_TOPIC);
    } else { Serial.print("."); delay(1000); }
  }
}

void setup() {
  Serial.begin(115200); delay(100);
  Serial.println("\n=== ESP32 IoT Node Boot ===");
  Serial.print("Device ID: "); Serial.println(DEVICE_ID);
  pinMode(LDR_PIN, INPUT); pinMode(TEMP_PIN, INPUT);
  connectWiFi(); connectMQTT();
}

void loop() {
  if (!client.connected()) { Serial.println("MQTT disconnected, reconnecting..."); connectMQTT(); }
  client.loop();
  sampleSensors();
  publishTelemetry();
}
