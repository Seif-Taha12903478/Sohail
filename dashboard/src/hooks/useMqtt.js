import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { config } from '../config.js';

export function useMqtt(onMessage) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);

  useEffect(() => {
    const client = mqtt.connect(config.mqttBroker);
    clientRef.current = client;

    client.on('connect', () => {
      setConnected(true);
      client.subscribe(config.telemetryTopic);
    });
    client.on('message', (topic, message) => {
      try {
        const reading = JSON.parse(message.toString());
        onMessage?.(reading);
      } catch (err) {
        console.error('Malformed telemetry:', err.message);
      }
    });
    client.on('error', (err) => console.error('MQTT error:', err.message));
    client.on('reconnect', () => setConnected(false));
    client.on('close', () => setConnected(false));

    return () => client.end(true);
  }, []);

  const sendCommand = useCallback((cmd, value) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish(config.commandTopic, JSON.stringify({ cmd, value }));
    }
  }, []);

  return { connected, sendCommand };
}
