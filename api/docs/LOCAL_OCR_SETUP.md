# Local OCR Setup (100% Private - No Third-Party APIs)

## 🔒 **Tesseract.js - Completely Local OCR**

Your OCR service is **fully local** using **Tesseract.js** - no external API calls, no third-party dependencies, no data leaving your server.

---

## ✅ **Quick Start (Already Configured!)**

The OCR service is **already set up** and ready to use:

1. ✅ **Tesseract.js installed** (`tesseract.js` package)
2. ✅ **Default provider set to `tesseract`**
3. ✅ **Worker pool configured** (2 parallel workers)
4. ✅ **Test endpoints available** at `/ocr/*`

---

## 🧪 **Test It Now**

### 1. Check OCR Status
```bash
curl http://localhost:3000/ocr/status
```

**Expected Response:**
```json
{
  "success": true,
  "provider": "tesseract",
  "available": true,
  "message": "OCR service (tesseract) is available"
}
```

### 2. Extract Text from an Image
```bash
curl -X POST http://localhost:3000/ocr/extract \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://tesseract.projectnaptha.com/img/eng_bw.png"
  }'
```

**Response:**
```json
{
  "success": true,
  "provider": "tesseract",
  "result": {
    "text": "Extracted text appears here",
    "confidence": 0.92,
    "language": "eng",
    "blocks": [...]
  }
}
```

---

## ⚙️ **Configuration**

### Current Settings (`.env`)

```bash
# OCR Configuration (Defaults - already active!)
OCR_PROVIDER=tesseract       # Uses local Tesseract.js
OCR_ENABLED=true             # Enabled by default
OCR_LANGUAGE=eng             # English (can be: eng, spa, fra, deu, etc.)
OCR_TESSERACT_WORKERS=2      # Number of parallel workers
OCR_MIN_CONFIDENCE=0.5       # Minimum confidence threshold
```

### Optional: Increase Performance

```bash
# Increase worker pool for faster parallel processing
OCR_TESSERACT_WORKERS=4  # More workers = faster batch processing
```

### Optional: Disable OCR

```bash
# Disable OCR completely
OCR_ENABLED=false
# or
OCR_PROVIDER=none
```

---

## 🌍 **Supported Languages**

Tesseract.js supports 100+ languages out of the box:

| Language | Code | Language | Code |
|----------|------|----------|------|
| English | `eng` | Spanish | `spa` |
| French | `fra` | German | `deu` |
| Italian | `ita` | Portuguese | `por` |
| Chinese (Simplified) | `chi_sim` | Japanese | `jpn` |
| Arabic | `ara` | Russian | `rus` |

**Change language:**
```bash
# In .env
OCR_LANGUAGE=spa  # Spanish

# Or per-request
curl -X POST http://localhost:3000/ocr/extract \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/spanish-image.jpg",
    "language": "spa"
  }'
```

---

## 🚀 **Performance Characteristics**

### Tesseract.js (Local)

| Metric | Value |
|--------|-------|
| **Type** | 100% Local (no API calls) |
| **Speed** | 2-5 seconds per image |
| **Accuracy** | 80-95% (varies by image quality) |
| **Cost** | **FREE** (no usage limits!) |
| **Privacy** | **Complete** (data never leaves server) |
| **Parallel Processing** | ✅ Yes (worker pool) |
| **Languages** | 100+ supported |

### Worker Pool Optimization

```
1 Worker:  Process 1 image at a time  (slow)
2 Workers: Process 2 images in parallel (default) ⭐
4 Workers: Process 4 images in parallel (faster)
8 Workers: Process 8 images in parallel (fastest, more CPU)
```

**Example:** 10 images with 2 workers = ~15 seconds total (vs 30 seconds with 1 worker)

---

## 📊 **How It Works**

### Architecture

```
┌─────────────────────────────────────────────┐
│            Your Server (100% Local)          │
│  ┌───────────────────────────────────────┐  │
│  │   TesseractOCRService                 │  │
│  │   ┌─────────────────────────────┐     │  │
│  │   │  Worker Pool (2 workers)    │     │  │
│  │   │  ┌────────┐    ┌────────┐   │     │  │
│  │   │  │Worker 1│    │Worker 2│   │     │  │
│  │   │  └────────┘    └────────┘   │     │  │
│  │   └─────────────────────────────┘     │  │
│  │                                       │  │
│  │   Tesseract.js Engine                │  │
│  │   (WebAssembly + trained models)     │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ✅ No external API calls                   │
│  ✅ No data sent to third parties           │
│  ✅ Runs completely on your hardware        │
└─────────────────────────────────────────────┘
```

### Process Flow

1. **Image arrives** (URL or buffer)
2. **Download image** (if URL)
3. **Worker pool assigns** available worker
4. **Tesseract processes** image locally
5. **Text extracted** with confidence scores
6. **Result returned** to caller

**Zero external dependencies!** 🎉

---

## 🔧 **Advanced Usage**

### Batch Processing (Multiple Images)

```bash
curl -X POST http://localhost:3000/ocr/extract-batch \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg"
    ]
  }'
```

**Result:** All 3 images processed in parallel using worker pool!

### Code Example

```typescript
import { OCRServiceFactory } from './infrastructure/ocr/OCRServiceFactory';

// Get the local OCR service
const ocrService = OCRServiceFactory.createFromEnv();

// Extract text from an image
const result = await ocrService.extractTextFromImage(
  'https://example.com/screenshot.png'
);

console.log('Text:', result.text);
console.log('Confidence:', result.confidence);
console.log('Words detected:', result.blocks?.length);
```

---

## 💡 **Best Practices**

### Image Quality

Tesseract works best with:
- ✅ High-contrast images (black text on white background)
- ✅ Clear, sharp text (not blurry)
- ✅ Horizontal text (not rotated)
- ✅ Standard fonts (not handwriting)

### Performance Tips

1. **Use worker pool** - Already configured! (2 workers default)
2. **Batch images** - Use `/ocr/extract-batch` for multiple images
3. **Increase workers for high load** - Set `OCR_TESSERACT_WORKERS=4`
4. **Pre-filter images** - Only OCR images that likely contain text

---

## 🆚 **Comparison: Local vs Cloud**

| Feature | Tesseract (Local) | Google Vision (Cloud) |
|---------|-------------------|----------------------|
| **Privacy** | ✅ 100% Private | ❌ Data sent to Google |
| **Cost** | ✅ FREE | 💰 $1.50/1000 images |
| **Speed** | ⏱️ 2-5s/image | ⚡ 1-2s/image |
| **Accuracy** | 📊 80-95% | 📊 95-99% |
| **Setup** | ✅ Zero config | ❌ API key required |
| **Limits** | ✅ Unlimited | ❌ Pay per use |
| **Dependencies** | ✅ None | ❌ Requires internet |

**Recommendation:** Start with Tesseract (local). Upgrade to Google Vision only if you need higher accuracy for critical use cases.

---

## 🔄 **Integration Example (Future Use)**

When ready to add OCR to your pipeline:

```typescript
// In CleanupWorker or dedicated OCRWorker
async processContent(content: Content): Promise<Content> {
  // Check if content has images
  const imageUrls = content.media
    .filter(m => m.type === 'image')
    .map(m => m.url);

  if (imageUrls.length === 0) {
    return content; // No images, skip OCR
  }

  // Extract text from all images
  const ocrResults = await this.ocrService.extractTextFromImages(imageUrls);

  // Combine extracted text
  const imageText = ocrResults
    .map(r => r.text)
    .filter(t => t.length > 0)
    .join(' ');

  // Update content with enhanced text
  if (imageText.length > 0) {
    const enhancedText = `${content.text} [Images: ${imageText}]`;
    return content.withTextWithDescriptions(enhancedText);
  }

  return content;
}
```

---

## 🐛 **Troubleshooting**

### OCR Status Returns "Not Available"

**Check:**
1. Tesseract.js is installed: `npm list tesseract.js`
2. Server logs for errors: Check console output
3. Worker pool initialization: Look for "Tesseract worker pool initialized"

**Fix:**
```bash
# Reinstall tesseract.js
npm install tesseract.js

# Restart server
npm run dev
```

### Low Accuracy Results

**Solutions:**
1. Use higher quality images
2. Pre-process images (increase contrast, remove noise)
3. Specify correct language: `OCR_LANGUAGE=eng`
4. Consider Google Vision for critical text extraction

### Slow Performance

**Optimize:**
```bash
# Increase worker pool
OCR_TESSERACT_WORKERS=4

# Use batch processing
POST /ocr/extract-batch  (processes in parallel)
```

---

## ✅ **Summary**

**What You Have:**
- ✅ 100% local OCR (Tesseract.js)
- ✅ No third-party APIs required
- ✅ Complete privacy (data never leaves your server)
- ✅ FREE unlimited usage
- ✅ 100+ languages supported
- ✅ Worker pool for parallel processing
- ✅ Ready to test at `/ocr/*` endpoints

**What You DON'T Need:**
- ❌ No API keys
- ❌ No external services
- ❌ No usage fees
- ❌ No data privacy concerns

**Your OCR service is ready to use right now!** 🚀

Test it:
```bash
curl http://localhost:3000/ocr/status
```
