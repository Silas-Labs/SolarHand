package Telemetry

import "time"

type Telemetry struct {
	Timestamp   time.Time `json:"timestamp"`
	StationName string    `json:"station_name"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Voltage     float64   `json:"voltage"`
	Current     float64   `json:"current"`
	Temperature float64   `json:"temperature"`
	Power       float64   `json:"power"`
	Status      string    `json:"status"`
	Ticket      int64	   `json:"ticket"`
}
