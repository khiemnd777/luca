package templateasset

import _ "embed"

// DeliveryNoteHTML is the HTML source for delivery note PDF generation.
//
//go:embed delivery_note.html
var DeliveryNoteHTML string

// OrderQRSlipA5HTML is the HTML source for the A5 QR slip PDF generation.
//
//go:embed order_qr_slip_a5.html
var OrderQRSlipA5HTML string
