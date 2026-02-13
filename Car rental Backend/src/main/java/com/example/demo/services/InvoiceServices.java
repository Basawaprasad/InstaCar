// src/main/java/com/example/demo/services/InvoiceServices.java
package com.example.demo.services;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Service;

import com.example.demo.entities.Booking;
import com.example.demo.repos.BookingRepo;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

@Service
public class InvoiceServices {
    private final BookingRepo bookingRepo;

    public InvoiceServices(BookingRepo bookingRepo) {
        this.bookingRepo = bookingRepo;
    }

    public byte[] generateInvoicePdf(Long bookingId) {
        Booking b = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        String html = buildHtml(b);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to render invoice PDF", e);
        }
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private String buildHtml(Booking b) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

        String user  = b.getUser() != null ? esc(b.getUser().getFullname()) : "—";
        String email = b.getUser() != null ? esc(b.getUser().getEmail()) : "—";
        String dl    = b.getUser() != null ? esc(String.valueOf(b.getUser().getDrivingLicenseNumber())) : "—";

        String car = b.getCar() != null
                ? esc(b.getCar().getBrand()) + " " + esc(b.getCar().getModel())
                : "—";

        String reg = b.getCar() != null ? esc(String.valueOf(b.getCar().getRegistrationNumber())) : "—";
        String loc = b.getCar() != null ? esc(String.valueOf(b.getCar().getLocation())) : "—";

        String payId = b.getPaymentId() != null
                ? esc(String.valueOf(b.getPaymentId()))
                : "—";

        String status = b.getStatus() != null
                ? esc(b.getStatus().toString())
                : "—";

        String start = b.getStartDate() != null ? esc(b.getStartDate().toString()) : "—";
        String end   = b.getEndDate()   != null ? esc(b.getEndDate().toString())   : "—";

        // FIXED: getTotalPrice() is primitive double in your model, so no null check — convert to String
        String total = esc(String.valueOf(b.getTotalPrice()));

        String css = """
            <style>
              body{font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#0f172a; padding:24px;}
              h1,h2,h3{margin:0;}
              .muted{color:#64748b}
              .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
              .box{border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-top:12px}
              table{width:100%;border-collapse:collapse;margin-top:8px}
              th,td{border-bottom:1px solid #e5e7eb;padding:8px 6px;text-align:left}
              .right{text-align:right}
              .badge{display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid #d1d5db;font-size:12px}
            </style>
        """;

        String html = """
            <html><head><meta charset="utf-8"/>%s<title>Invoice #%d</title></head>
            <body>
              <div class="header">
                <div>
                  <h2>Invoice #%d</h2>
                  <div class="muted">Generated: %s</div>
                </div>
                <div><span class="badge">Status: %s</span></div>
              </div>

              <div class="box">
                <strong>Bill To</strong><br/>
                %s<br/>
                %s • DL: %s<br/>
              </div>

              <div class="box">
                <strong>Booking Details</strong>
                <table>
                  <tr><th>Car</th><td>%s</td></tr>
                  <tr><th>Reg #</th><td>%s</td></tr>
                  <tr><th>Location</th><td>%s</td></tr>
                  <tr><th>Start</th><td>%s</td></tr>
                  <tr><th>End</th><td>%s</td></tr>
                  <tr><th>Payment ID</th><td>%s</td></tr>
                </table>
              </div>

              <div class="box">
                <strong>Charges</strong>
                <table>
                  <tr><td>Rental Amount</td><td class="right">₹%s</td></tr>
                  <tr><td><em>Taxes (included if applicable)</em></td><td class="right">—</td></tr>
                  <tr><th>Total</th><th class="right">₹%s</th></tr>
                </table>
              </div>

              <p class="muted">This is a system-generated invoice.</p>
            </body></html>
        """.formatted(
                css, b.getId(),
                b.getId(),
                now,
                status,
                user, email, dl,
                car, reg, loc, start, end, payId,
                total, total
        );

        return new String(html.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
    }
}
