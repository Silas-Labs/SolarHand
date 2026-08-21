package main

import (
	"fmt"
	"Simulator/SolarStations"
	"Simulator/StationMetrics"
	"time"
)

func main() {

	stations, err := SolarStations.LoadStations("data/stations.json")

	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Number of stations:", len(stations))

	for _, station := range stations {

		metrics := StationMetrics.Generate()
		timestamp := time.Now()

		fmt.Println(
			timestamp,
			station.StationName,
			station.Latitude,
			station.Longitude,
			metrics.Voltage,
			metrics.Current,
			metrics.Temperature,
			metrics.Power,
		)
	}
}