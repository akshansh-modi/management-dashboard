# Design Plan: Detailed System Activity Diagram

We will build a detailed Mermaid diagram that maps the key actors and operations across all business scenarios.

## 1. Actors & Systems
* **Buyer**: Performs catalog checkout, initiates UPI payment, enters UTR reference.
* **Seller**: Fulfills orders, edits inventory/products, updates transition states.
* **Admin**: Verifies payments (Stage-10 and Stage-90), manages system users, configurations.
* **System (Cron/Backend)**: Handles calculations, expiry timers, automated status history logging.

## 2. Scenarios to Cover
1. **Scenario A (Happy Path)**: Checkout -> Stage-10 payment -> Admin/Seller UTR match -> Confirmation -> Fulfillment -> Stage-90 creation -> Balance matching -> Completion.
2. **Scenario B (Timeout & Auto-Expiry)**: Checkout -> Stage-10 payment -> No payment in 24 hours -> Hourly cron cancels order and expires payment.
3. **Scenario C (Cancellation Path)**: Seller or Admin cancels the order before fulfillment due to lack of stock or dispute.
4. **Scenario D (Dynamic Catalog Setup)**: Seller adds simple vs variant product, adding specifications (attributes).
