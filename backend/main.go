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

	SiteContactName  string   `json:"site_contact_name"`
	SiteContactPhone string   `json:"site_contact_phone"`
	Checklist        []string `json:"checklist"`
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

var (
	mu           sync.RWMutex
	stationStore = make(map[string]Telemetry.Telemetry)
	workOrders   = []WorkOrder{
		{
			ID:          "WO-4821",
			Station:     "Kisumu Solar Station 002",
			Title:       "Inverter Array B Fault",
			Description: "String voltage dropped 40% over 20 minutes.",
			Urgency:     "urgent",
			Status:      "Dispatched",
			Timestamp:   time.Now().Add(-2 * time.Hour),

			SiteContactName:  "Grace Achieng",
			SiteContactPhone: "+254 712 345 678",
			Checklist: []string{
				"Inspect inverter array B connections",
				"Measure string voltage output",
				"Reset and verify normal operation",
			},
		},
	}
)

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func handleStationMetrics(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method == http.MethodPost {
		var t Telemetry.Telemetry
		err := json.NewDecoder(r.Body).Decode(&t)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		mu.Lock()
		stationStore[t.StationName] = t
		mu.Unlock()

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
		return
	}

	// GET request returns all current station telemetries
	mu.RLock()
	defer mu.RUnlock()

	var result []Telemetry.Telemetry
	for _, t := range stationStore {
		result = append(result, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func handleStations(w http.ResponseWriter, r *http.Request) {
	handleStationMetrics(w, r)
}

func handleMetricsSummary(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	mu.RLock()
	defer mu.RUnlock()

	total := len(stationStore)
	if total == 0 {
		total = 100
	}

	normalCount := 0
	warningCount := 0
	faultCount := 0
	totalPowerWatts := 0.0

	for _, t := range stationStore {
		totalPowerWatts += t.Power
		switch t.Status {
		case "NORMAL":
			normalCount++
		case "WARNING":
			warningCount++
		case "FAULT":
			faultCount++
		}
	}

	uptimePct := 100.0
	if total > 0 {
		uptimePct = (float64(normalCount) / float64(total)) * 100.0
	}

	summary := SummaryMetrics{
		FleetUptimePercent:    uptimePct,
		ActiveAlertsCount:     faultCount + warningCount,
		ActiveWorkOrdersCount: faultCount,
		SystemsOfflineCount:   faultCount,
		TechniciansDispatched: faultCount,
		TotalStationsCount:    total,
		TotalPowerKW:          totalPowerWatts / 1000.0,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

func handleAlerts(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	mu.RLock()
	defer mu.RUnlock()

	var alerts []AlertItem
	idx := 1
	for _, t := range stationStore {
		if t.Status != "NORMAL" {
			severity := "High"
			sla := "2h 15m left to fix"
			if t.Status == "FAULT" {
				severity = "Critical"
				sla = "45 minutes left to fix"
			}
			alerts = append(alerts, AlertItem{
				ID:        fmt.Sprintf("AL-%d", 4800+idx),
				Severity:  severity,
				Asset:     fmt.Sprintf("Solar Inverter Array (%.1fV)", t.Voltage),
				Site:      t.StationName,
				Cause:     fmt.Sprintf("Telemetry %s: Voltage %.1fV, Temp %.1f°C, Power %.0fW", t.Status, t.Voltage, t.Temperature, t.Power),
				SLA:       sla,
				Status:    "UNRESOLVED",
				CreatedAt: t.Timestamp,
			})
			idx++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(alerts)
}

func handleWorkOrders(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method == http.MethodPost {
		var req WorkOrder
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if req.ID == "" {
			req.ID = fmt.Sprintf("WO-%d", 5000+len(workOrders))
		}
		if req.Status == "" {
			req.Status = "Pending"
		}
		if req.Timestamp.IsZero() {
			req.Timestamp = time.Now().UTC()
		}

		mu.Lock()
		workOrders = append([]WorkOrder{req}, workOrders...)
		mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":     true,
			"tracking_id": req.ID,
			"message":     "Work order created successfully",
		})
		return
	}

	mu.RLock()
	defer mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workOrders)
}

func runSimulator(stations []SolarStations.Station) {
	fmt.Printf("Starting telemetry simulator loop for %d stations...\n", len(stations))
	for i := 0; ; i++ {
		if i >= len(stations) {
			i = 0
		}

		station := stations[i]
		metrics := StationMetrics.Generate()

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

		// Update in-memory station store
		mu.Lock()
		stationStore[telemetry.StationName] = telemetry
		mu.Unlock()

		// Also post to HTTP endpoint to verify API ingestion
		_ = sendTelemetry(telemetry)

		time.Sleep(200 * time.Millisecond)
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
	return nil
}

func main() {
	stations, err := SolarStations.LoadStations("data/stations.json")
	if err != nil {
		log.Fatalf("Error loading stations JSON: %v", err)
	}
	fmt.Printf("Loaded %d solar stations from data/stations.json\n", len(stations))

	// Pre-seed stationStore with initial state for all stations
	mu.Lock()
	for _, st := range stations {
		stationStore[st.StationName] = Telemetry.Telemetry{
			Timestamp:   time.Now().UTC(),
			StationName: st.StationName,
			Latitude:    st.Latitude,
			Longitude:   st.Longitude,
			Voltage:     18.5,
			Current:     8.0,
			Temperature: 30.0,
			Power:       148.0,
			Status:      "NORMAL",
		}
	}
	mu.Unlock()

	// Register API endpoints
	http.HandleFunc("/Stationmetrics", handleStationMetrics)
	http.HandleFunc("/api/stations", handleStations)
	http.HandleFunc("/api/metrics/summary", handleMetricsSummary)
	http.HandleFunc("/api/alerts", handleAlerts)
	http.HandleFunc("/api/work-orders", handleWorkOrders)

	// Start backend server on port 8000
	fmt.Println("==================================================")
	fmt.Println("🚀 SolarHand Backend Server listening on http://localhost:8000")
	fmt.Println("==================================================")

	// Launch simulator loop in goroutine
	go runSimulator(stations)

	// Listen and serve
	err = http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatalf("Failed to start server on :8000: %v", err)
	}
}
