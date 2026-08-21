package Tickets

import (
	"crypto/rand"
	"math/big"
)

func GenerateTicketID() int64 {
	// Range is max - min + 1 (9999 - 1000 + 1 = 9000)
	max := big.NewInt(9000) 
	
	// Generates a random number from 0 to 8999
	randomNum, err := rand.Int(rand.Reader, max)
	if err != nil {
		return 1000 // Fallback minimum value in case of error
	}
	
	// Add the minimum value (1000) to shift the range to 1000-9999
	return randomNum.Int64() + 1000
}