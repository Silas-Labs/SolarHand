package StationMetrics

import (
	"math/rand"
	"time"
)

type Metrics struct {
	Voltage     float64
	Current     float64
	Temperature float64
	Power       float64
	Status      string
}

func Generate() Metrics {

	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	var voltage float64
	var current float64
	var temperature float64

	// Decide what type of reading to generate
	roll := r.Intn(100)

	switch {
	case roll < 80:
		// NORMAL
		voltage = 15 + r.Float64()*5
		current = 5 + r.Float64()*10
		temperature = 20 + r.Float64()*25

	case roll < 90:
		// WARNING
		voltage = 15 + r.Float64()*5
		current = 5 + r.Float64()*10
		temperature = 45 + r.Float64()*15

	default:
		// FAULT
		voltage = 20 + r.Float64()*10
		current = 15 + r.Float64()*10
		temperature = 60 + r.Float64()*20
	}

	power := voltage * current

	status := GetStatus(
		voltage,
		current,
		temperature,
		power,
	)

	return Metrics{
		Voltage:     voltage,
		Current:     current,
		Temperature: temperature,
		Power:       power,
		Status:      status,
	}
}



func GetStatus(voltage, current, temperature, power float64) string {

	if voltage > 20 {
		return "FAULT"
	}

	if current > 15 {
		return "FAULT"
	}

	if temperature > 60 {
		return "FAULT"
	}

	if temperature > 45 {
		return "WARNING"
	}

	return "NORMAL"
}
