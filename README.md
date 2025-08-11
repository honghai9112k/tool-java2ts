# Java to TypeScript Converter

Tool để convert Java classes và enums sang TypeScript interfaces và enums với tốc độ cực nhanh.

## ✨ Tính năng chính

- 🚀 **Ultra Fast Conversion**: Convert 1000+ files trong vài giây
- 📦 **Batch Processing**: Xử lý hàng loạt với 25 files/batch  
- 🔄 **Smart Imports**: Tự động generate imports với relative paths
- 📝 **Interface Generation**: Convert Java classes → TypeScript interfaces
- 🏷️ **Enum Support**: Convert Java enums → TypeScript enums
- ⚡ **Optional Properties**: Tất cả properties có dấu `?`
- 🎯 **@JsonProperty Support**: Chuyển đổi chính xác annotations
- 🌐 **Web Interface**: UI đơn giản với 2 buttons chính

## 🚀 Cài đặt và sử dụng

### 1. Cài đặt dependencies:
```bash
npm install
```

### 2. Khởi chạy server:
```bash
npm start
```

### 3. Mở trình duyệt: 
```
http://localhost:3000
```

## 🎯 Sử dụng

### Cách 1: Web Interface (Đơn giản)
1. Truy cập `http://localhost:3000`
2. Click **"Convert Cực Nhanh"** để convert tất cả files trong `examples/`
3. Click **"Update Imports"** để cập nhật imports cho files đã convert
4. Kết quả sẽ xuất hiện trong thư mục `outputs/`

### Cách 2: Thêm files Java mới
1. Copy files Java vào thư mục `examples/` (giữ nguyên cấu trúc thư mục)
2. Click **"Convert Cực Nhanh"** 
3. Files TypeScript tương ứng sẽ được tạo trong `outputs/`

## 📊 Performance

- **Tốc độ**: 500-1000+ files/second
- **Batch size**: 25 files/batch 
- **Memory**: Optimized với caching
- **Success rate**: 99%+ với proper Java syntax

## 📝 Ví dụ Conversion

### Java Class → TypeScript Interface

**Input (Java):**
```java
package oda.sid.tmf.model.service;

public class Service extends AbstractEntity {
    private String serviceType;
    private boolean isBundle;
    
    @JsonProperty("@type")
    private String atType;
    
    @JsonProperty("@baseType")
    private String atBaseType;
}
```

**Output (TypeScript):**
```typescript
import { AbstractEntity } from '../../../../sid/tmf/model/base/AbstractEntity';

export interface Service extends AbstractEntity {
  serviceType?: string;
  isBundle?: boolean;
  "@type"?: string;
  "@baseType"?: string;
}
```

### Java Enum → TypeScript Enum

**Input (Java):**
```java
public enum AppointmentStateType {
  INITIALIZED("initialized"),
  CONFIRMED("confirmed"),
  CANCELLED("cancelled");
}
```

**Output (TypeScript):**
```typescript
export enum AppointmentStateType {
  INITIALIZED = "initialized",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled"
}
```

## 🏗️ Cấu trúc Project

```
tool-java2js/
├── src/
│   ├── index.js                          # Main server với web interface
│   └── converter/
│       └── JavaToTypeScriptConverter.js  # Core conversion logic
├── examples/                             # Input Java files
├── outputs/                              # Generated TypeScript files  
├── uploads/                              # Temporary upload directory
├── package.json
└── README.md
```

## ⚙️ Conversion Features

### 🎯 Supported Conversions

- ✅ **Java Classes** → TypeScript Interfaces
- ✅ **Java Enums** → TypeScript Enums
- ✅ **@JsonProperty** annotations → Proper field names
- ✅ **Inheritance** → Interface extends
- ✅ **Collections** → TypeScript arrays
- ✅ **Optional Properties** → All fields có dấu `?`

### 🚫 Không support

- ❌ Methods (chỉ convert fields)
- ❌ Complex logic
- ❌ Inner classes
- ❌ Generic constraints

## 🛠️ Development

### Scripts
- `npm start` - Khởi chạy server
- `npm run dev` - Development với nodemon

### Extending Converter
Chỉnh sửa `JavaToTypeScriptConverter.js` để thêm conversion rules:

```javascript
// Thêm type mapping
this.javaToTsTypeMap['CustomType'] = 'TypeScriptType';

// Thêm pattern mới
const customPattern = /pattern/g;
```

## 📋 Type Mappings

| Java Type | TypeScript Type |
|-----------|----------------|
| String    | string         |
| int/Integer | number       |
| boolean/Boolean | boolean  |
| List<T>   | T[]           |
| Date      | Date          |
| Object    | any           |

## 🐛 Troubleshooting

- **Files không convert**: Kiểm tra syntax Java và file size
- **Missing imports**: Click "Update Imports" sau khi convert
- **Performance slow**: Giảm batch size nếu cần

## 📄 License

MIT License
