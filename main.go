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

	// ❌ REMOVED: Ticketnumber is no longer generated out here!

	stations, err := SolarStations.LoadStations("data/stations.json")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Number of stations:", len(stations))

	for i := 0; ; i++ {

		if i >= len(stations) {
			fmt.Println("\n⏳ [BATCH COMPLETE] Sent telemetry for all stations.")
			fmt.Println("⏳ Resting for 5 seconds before the next cycle...\n")
			
			time.Sleep(5 * time.Second) 
			i = 0                        
		}

		station := stations[i]

		// ✅ FIX: Move this INSIDE the loop. 
		// It now creates a brand-new unique ticket number for this specific station.
		Ticketnumber := Tickets.GenerateTicketID()

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
			Ticket:		 Ticketnumber, // Receives the freshly generated ID
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
		fmt.Println("Ticket # :", telemetry.Ticket)

		// Send telemetry to API
		err := sendTelemetry(telemetry)
		if err != nil {
			fmt.Println("API Error:", err)
		} else {
			fmt.Println("Telemetry sent successfully")
		}

		fmt.Println("==============================================")
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
