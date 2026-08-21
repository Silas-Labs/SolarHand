package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"Simulator/SolarStations"
	"Simulator/StationMetrics"
	"Simulator/Telemetry"
)

type WorkOrder struct {
	ID          string    `json:"id"`
	Station     string    `json:"station"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Urgency     string    `json:"urgency"`
	Status      string    `json:"status"`
	Timestamp   time.Time `json:"timestamp"`
}

type SummaryMetrics struct {
	FleetUptimePercent    float64 `json:"fleet_uptime_percent"`
	ActiveAlertsCount     int     `json:"active_alerts_count"`
	ActiveWorkOrdersCount int     `json:"active_work_orders_count"`
	SystemsOfflineCount   int     `json:"systems_offline_count"`
	TechniciansDispatched int     `json:"technicians_dispatched_count"`
	TotalStationsCount    int     `json:"total_stations_count"`
	TotalPowerKW          float64 `json:"total_power_kw"`
}

type AlertItem struct {
	ID        string    `json:"id"`
	Severity  string    `json:"severity"`
	Asset     string    `json:"asset"`
	Site      string    `json:"site"`
	Cause     string    `json:"cause"`
	SLA       string    `json:"sla"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}
