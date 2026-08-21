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
}

func Generate() Metrics {

    r := rand.New(rand.NewSource(time.Now().UnixNano()))

    voltage := 15 + r.Float64()*5
    current := 5 + r.Float64()*10
    temperature := 20 + r.Float64()*25

    power := voltage * current

    return Metrics{
        Voltage:     voltage,
        Current:     current,
        Temperature: temperature,
        Power:       power,
    }
}
