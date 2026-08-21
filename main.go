// Simulator  Bot
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"Simulator/SolarStations"
	"Simulator/StationMetrics"
	"Simulator/Telemetry"
	"Simulator/Tickets"
)

func main() {

	Tickets.GenerateTicket()

	stations, err := SolarStations.LoadStations("data/stations.json")

	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Number of stations:", len(stations))

	for i := 0; ; i++ {

		if i >= len(stations) {
			i = 0
		}

		station := stations[i]

		// Generate metrics
		metrics := StationMetrics.Generate()

		// Create telemetry object
		telemetry := Telemetry.Telemetry{
			Timestamp:   time.Now().UTC(),
			StationName: station.StationName,
			Latitude:    station.Latitude,
			Longitude:   station.Longitude,
			Voltage:     metrics.Voltage,
			Current:     metrics.Current,
			Temperature: metrics.Temperature,
			Power:       metrics.Power,
			Status:      metrics.Status,
		}

		// Display telemetry in terminal
		fmt.Println("==============================================")
		fmt.Println("Station:", telemetry.StationName)
		fmt.Println("Timestamp:", telemetry.Timestamp)
		fmt.Println("Latitude:", telemetry.Latitude)
		fmt.Println("Longitude:", telemetry.Longitude)
		fmt.Println("Voltage:", telemetry.Voltage, "V")
		fmt.Println("Current:", telemetry.Current, "A")
		fmt.Println("Temperature:", telemetry.Temperature, "°C")
		fmt.Println("Power:", telemetry.Power, "W")
		fmt.Println("Status:", telemetry.Status)

		// Send telemetry to API
		err := sendTelemetry(telemetry)

		if err != nil {
			fmt.Println("API Error:", err)
		} else {
			fmt.Println("Telemetry sent successfully")
		}

		fmt.Println("==============================================")

		// Wait before processing next station
		time.Sleep(1 * time.Second)
	}
}

func sendTelemetry(telemetry Telemetry.Telemetry) error {

	data, err := json.Marshal(telemetry)

	if err != nil {
		return err
	}

	resp, err := http.Post(
		"http://localhost:8000/Stationmetrics",
		"application/json",
		bytes.NewBuffer(data),
	)

	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("server returned status %s", resp.Status)
	}

	return nil
}
