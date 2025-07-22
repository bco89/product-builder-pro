# Test Plan: Pricing Parameter Flow

## Test Steps

1. **Start Product Builder**
   - Navigate to the Product Builder
   - Complete Step 1 (Vendor & Type)

2. **Enter Pricing in Step 2**
   - In Product Details step, enter:
     - Title: "Test Product"
     - Price: "$35.95"
     - Compare at price: "$49.99" (optional)
     - Cost: "$15.00" (optional)

3. **Generate AI Description in Step 3**
   - Use any generation method (URL, manual, or context)
   - Check browser console for the payload being sent
   - The payload should now include:
     ```json
     "pricing": [{
       "price": "35.95",
       "compareAtPrice": "49.99",
       "cost": "15.00"
     }]
     ```

4. **Verify in LLM Prompt**
   - Check the generated prompt (in logs or saved files)
   - Should show: `- Price: $35.95` instead of `- Price: Not specified`

## Expected Results

- The pricing data from Step 2 is passed to the AI generation service
- The AI prompt includes the actual price entered by the user
- Price-based template selection works correctly (technical vs lifestyle based on price threshold)

## Files Modified

1. **app/routes/product-builder/steps/StepAIDescription.tsx**
   - Added `pricing` to the formData interface
   - Added `pricing: formData.pricing` to the API payload

2. **app/services/ai.server.ts**
   - Removed duplicate HTML formatting rules from the prompt