package SolarStations

import (
	"encoding/json"
	"fmt"
	"os"
)

type Station struct {
	StationName string  `json:"station_name"`
	Longitude   float64 `json:"longitude"`
	Latitude    float64 `json:"latitude"`
}

func LoadStations(filename string) ([]Station, error) {

	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read stations file: %w", err)
	}

	var stations []Station

	err = json.Unmarshal(data, &stations)
	if err != nil {
		return nil, fmt.Errorf("failed to parse stations JSON: %w", err)
	}

	return stations, nil
}

