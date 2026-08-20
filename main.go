package main

import (
	"fmt"
	"Simulator/SolarStations"
	"Simulator/StationMetrics"
)

func main() {

	stations, err := SolarStations.LoadStations("data/stations.json")

	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Number of stations:", len(stations))

	for _, station := range stations {
		fmt.Println(
			station.StationName,
			station.Latitude,
			station.Longitude,
		)
	}


	StationMetrics.StationMetrics()
}
