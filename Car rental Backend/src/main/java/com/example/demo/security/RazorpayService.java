package com.example.demo.security;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import javax.annotation.PostConstruct;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Refund;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
public class RazorpayService {

    @Value("${razorpay.keyId}")
    private String keyId;

    @Value("${razorpay.keySecret}")
    private String keySecret;

    private RazorpayClient client;

    @PostConstruct
    public void init() {
        try {
            client = new RazorpayClient(keyId, keySecret);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize Razorpay client", e);
        }
    }

    /**
     * Creates a Razorpay order.
     *
     * @param amountInRupees amount in rupees (double)
     * @param receipt        custom receipt string (e.g., "booking_<id>")
     * @return JSONObject order returned by SDK which contains id, amount, currency ...
     * @throws Exception on failure
     */
    public JSONObject createOrder(double amountInRupees, String receipt) throws Exception {
        // amount in paise
        int amountPaise = (int) Math.round(amountInRupees * 100);

        Map<String, Object> orderRequest = new HashMap<>();
        orderRequest.put("amount", amountPaise);
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt", receipt);
        orderRequest.put("payment_capture", 1); // auto capture if you want

        Order order = client.orders.create(new JSONObject(orderRequest));
        return order.toJson();
    }

    /**
     * Verifies razorpay signature.
     *
     * @param orderId
     * @param paymentId
     * @param signature
     * @return true if signature valid
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String computed = bytesToHex(digest);
            // signature provided by Razorpay is hex also (lowercase). Compare case-insensitively.
            return computed.equalsIgnoreCase(signature);
        } catch (Exception e) {
            return false;
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public String getKeyId() {
        return keyId;
    }

    // NEW: createRefund helper
    public Refund createRefund(String paymentId, Double amountInRupees, Map<String, Object> notes) throws RazorpayException {
        if (paymentId == null || paymentId.isBlank()) {
            throw new IllegalArgumentException("paymentId is required for refund");
        }

        Map<String, Object> refundRequest = new HashMap<>();
        if (amountInRupees != null && amountInRupees > 0) {
            int amountPaise = (int) Math.round(amountInRupees * 100);
            refundRequest.put("amount", amountPaise);
        }
        if (notes != null && !notes.isEmpty()) {
            refundRequest.put("notes", notes);
        }

        // Use SDK: lower-case 'payments'
        return client.payments.refund(paymentId, new org.json.JSONObject(refundRequest));
    }

    // NEW (careful): expose keySecret if you need to create client elsewhere (prefer using this service)
    public String getKeySecretUnsafe() {
        return this.keySecret;
    }

	public boolean verifySignature1(String orderId, String razorpayPaymentId, String signature) {
		// TODO Auto-generated method stub
		return verifySignature(orderId, razorpayPaymentId, signature);
	}
}
