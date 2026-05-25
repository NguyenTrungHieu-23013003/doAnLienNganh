---
name: Kỹ năng Tích hợp AI (AI Integration Basics)
description: Các nguyên tắc và best practices cốt lõi khi tích hợp LLM API vào dự án để đảm bảo an toàn, bảo mật và hiệu suất, rút ra từ kinh nghiệm thực tiễn.
---

# Kỹ năng Tích hợp AI (AI Integration Best Practices)

Kỹ năng này được đúc kết từ các bài học thực tế, nhằm đảm bảo việc đưa AI (thông qua LLM APIs như OpenAI, Groq, Anthropic, Gemini,...) vào bất kỳ dự án nào tiếp theo cũng phải tuân thủ chuẩn mức về bảo mật, xử lý lỗi và cấu trúc gọi API thông minh.

Mỗi khi bạn được yêu cầu tích hợp một công cụ AI hoặc viết script gọi LLM, hãy đảm bảo tuân thủ nghiêm ngặt 5 nguyên tắc sau đây:

## 1. TUYỆT ĐỐI BẢO MẬT API KEY (Sử dụng biến môi trường)
Đây là sai lầm dễ mắc phải và nguy hiểm nhất.
- **Không bao giờ hardcode API Key**: Tuyệt đối không dán trực tiếp API key vào mã nguồn (vd: `API_KEY = "sk-..."`). Code của bạn vô tình bị push lên GitHub sẽ khiến key bị lộ, dẫn đến hậu quả nghiêm trọng về chi phí hoặc tài khoản bị khóa.
- **Sử dụng Biến môi trường & file .env**: Luôn áp dụng cơ chế gọi môi trường để thay thế:
  ```python
  import os
  # Tốt: Mặc định giá trị rỗng nếu không tìm thấy, tránh crash lạ
  API_KEY = os.environ.get("LLM_API_KEY", "")
  ```
- **Lưu ý**: Hãy báo cho lập trình viên cần cấu hình file `.env` bằng hướng dẫn rõ ràng.

## 2. Thông Báo Cài Thư Viện Thân Thiện (Graceful Dependency Handling)
Môi trường mới thường không sẵn có các thư viện bên thứ 3 (như `openai`, `groq`, `tqdm`). Thay vì để hệ thống crash văng ra lỗi `ModuleNotFoundError` khô khan khiến người dùng bối rối, hãy dùng block `try-except` để hướng dẫn họ:
```python
try:
    from openai import OpenAI
except ImportError:
    print("\n[LỖI THƯ VIỆN] Vui lòng chạy lệnh sau để cài đặt các gói cần thiết trước khi tiếp tục:")
    print("pip install openai\n")
    exit(1)
```

## 3. Tối Ưu Tốc Độ Bằng Xử Lý Giới Hạn Quota (Rate Limiting)
Hầu hết các API cung cấp miễn phí hoạch định dạng cấp phép đều có giới hạn số lượt truy vấn mỗi phút (Rate limit - RPM).
- Không được nã request liên tục trong các vòng lặp vì sẽ gây lỗi `429 Too Many Requests`.
- Hãy chủ động chèn thêm `time.sleep(...)` mô phỏng độ trễ:
```python
import time
for query in list_queries:
    time.sleep(3.5) # Ví dụ đợi 3.5 giây cho Rate limit 15-20 req/phút của bản Free
    call_ai_api(query)
```

## 4. Tận Dụng Tính Đa Hình của API (Drop-in Replacements)
Nhiều nền tảng AI siêu tốc độ hiện nay (Groq, vLLM, LMStudio...) hỗ trợ chuẩn giao thiệp y hệt OpenAI. Do đó, bạn không bắt buộc cài library mới.
- Chỉ cần cấu hình lại tham số `base_url` để mở ra khả năng dễ dàng switch model/nhà cung cấp sau này:
```python
client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY", ""),
    base_url="https://api.groq.com/openai/v1"
)
```

## 5. Ép Khuôn Dữ Liệu Trả Về (Structured Output/JSON)
Một model LLM rất hay thích "nhiều lời", chèn những câu như `Dưới đây là kết quả:` hoặc format nhầm `markdown` dẫn tới lỗi Parser cho Backend/Frontend kế tiếp.
- Nếu bạn cần Data chuẩn, hãy dùng tham số hỗ trợ từ Library (ví dụ: `response_format={"type": "json_object"}`).
- Viết rõ trong System Prompt buộc AI xuất ra theo schema cụ thể và "không bao gồm text giải thích".
```python
response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[...],
    response_format={"type": "json_object"}, # Cực kỳ quan trọng
    temperature=0.7
)
```
