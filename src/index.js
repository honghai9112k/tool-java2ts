const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const JavaToTypeScriptConverter = require('./converter/JavaToTypeScriptConverter');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.java')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file .java'), false);
    }
  }
});

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Java to TypeScript Interface Converter</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; text-align: center; margin-bottom: 10px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
            .convert-section { text-align: center; padding: 40px 20px; border: 2px dashed #007acc; border-radius: 8px; margin: 20px 0; }
            .convert-btn { background: #007acc; color: white; border: none; padding: 15px 40px; font-size: 16px; border-radius: 5px; cursor: pointer; transition: background 0.3s; margin: 5px; }
            .convert-btn:hover { background: #005a99; }
            .info { background: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007acc; }
            .file-list { margin-top: 20px; }
            .file-item { padding: 8px 12px; margin: 5px 0; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #28a745; }
        </style>
        <script>
            async function convertFiles() {
                const btn = document.getElementById('convertBtn');
                const resultDiv = document.getElementById('result');
                
                btn.disabled = true;
                btn.textContent = 'Converting...';
                resultDiv.innerHTML = '<p>🚀 Convert All (CỰC NHANH)...</p>';
                
                const startTime = Date.now();
                
                try {
                    const response = await fetch('/convert-all', { method: 'POST' });
                    const data = await response.json();
                    
                    const endTime = Date.now();
                    const totalTime = Math.round((endTime - startTime) / 1000);
                    
                    if (data.success) {
                        let html = '<h3>✅ Convert All thành công!</h3>';
                        html += '<div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;">';
                        html += '<strong>📊 Thống kê:</strong><br>';
                        html += '• Tổng file: ' + data.totalFiles + '<br>';
                        html += '• Thành công: ' + data.successCount + '<br>';
                        html += '• Thời gian: ' + totalTime + ' giây<br>';
                        html += '• Tốc độ: ' + (data.speed || 'N/A') + '<br>';
                        html += '• ⚠️ Imports: Chạy riêng với nút Update Imports';
                        html += '</div>';
                        resultDiv.innerHTML = html;
                    } else {
                        resultDiv.innerHTML = '<p style="color: red;">❌ Lỗi: ' + data.error + '</p>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<p style="color: red;">❌ Lỗi kết nối: ' + error.message + '</p>';
                }
                
                btn.disabled = false;
                btn.textContent = '🚀 Convert All (CỰC NHANH)';
            }
            
            async function updateImports() {
                const btn = document.getElementById('importsBtn');
                const resultDiv = document.getElementById('result');
                
                btn.disabled = true;
                btn.textContent = 'Updating...';
                resultDiv.innerHTML = '<p>🔗 Đang update imports...</p>';
                
                const startTime = Date.now();
                
                try {
                    const response = await fetch('/update-imports', { method: 'POST' });
                    const data = await response.json();
                    
                    const endTime = Date.now();
                    const totalTime = Math.round((endTime - startTime) / 1000);
                    
                    if (data.success) {
                        let html = '<h3>🔗 Update imports thành công!</h3>';
                        html += '<div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;">';
                        html += '<strong>📊 Thống kê:</strong><br>';
                        html += '• File xử lý: ' + data.totalFiles + '<br>';
                        html += '• Thời gian: ' + totalTime + ' giây<br>';
                        html += '</div>';
                        resultDiv.innerHTML = html;
                    } else {
                        resultDiv.innerHTML = '<p style="color: red;">❌ Lỗi: ' + data.error + '</p>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<p style="color: red;">❌ Lỗi kết nối: ' + error.message + '</p>';
                }
                
                btn.disabled = false;
                btn.textContent = '🔗 Update Imports';
            }
        </script>
    </head>
    <body>
        <div class="container">
            <h1>Java to TypeScript Interface Converter</h1>
            <p class="subtitle">Convert tất cả file Java trong thư mục examples sang TypeScript interfaces</p>
            
            <div class="info">
                <strong>📁 Thư mục input:</strong> examples/ (bao gồm các thư mục con)<br>
                <strong>📁 Thư mục output:</strong> outputs/ (giữ nguyên cấu trúc thư mục)<br>
                <strong>🔄 Chức năng:</strong> Convert Java class → TypeScript interface<br>
                <strong>⚡ Tối ưu:</strong> Convert nhanh, imports riêng biệt
            </div>
            
            <div class="convert-section">
                <p>Chọn chế độ convert:</p>
                <button id="convertBtn" class="convert-btn" onclick="convertFiles()">🚀 Convert All (CỰC NHANH)</button>
                <br><br>
                <button id="importsBtn" class="convert-btn" style="background: #6c757d;" onclick="updateImports()">🔗 Update Imports</button>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                  1. Chạy "Convert All" trước (siêu nhanh, không imports)<br>
                  2. Sau đó chạy "Update Imports" để thêm imports
                </p>
            </div>
            
            <div id="result"></div>
        </div>
    </body>
    </html>
  `);
});

// Hàm đệ quy để tìm tất cả file .java trong thư mục và thư mục con
async function findAllJavaFiles(dir, baseDir = dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      const subFiles = await findAllJavaFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (item.name.endsWith('.java')) {
      const relativePath = path.relative(baseDir, fullPath);
      const relativeDir = path.dirname(relativePath);
      
      files.push({
        fullPath: fullPath,
        relativePath: relativePath,
        fileName: item.name,
        directory: relativeDir === '.' ? '' : relativeDir
      });
    }
  }
  
  return files;
}

// API endpoint để convert tất cả file Java - SIÊU NHANH
app.post('/convert-all', async (req, res) => {
  try {
    const examplesDir = path.join(__dirname, '..', 'examples');
    const outputsDir = path.join(__dirname, '..', 'outputs');
    
    await fs.ensureDir(outputsDir);
    
    let javaFiles = await findAllJavaFiles(examplesDir);
    
    // Chỉ skip test files
    javaFiles = javaFiles.filter(file => {
      const fileName = file.fileName.toLowerCase();
      return !fileName.includes('test') && !fileName.endsWith('test.java');
    });
    
    console.log(`FAST Convert All: ${javaFiles.length} files`);
    const startTime = Date.now();
    
    const converter = new JavaToTypeScriptConverter();
    
    // XỬ LÝ CỰC NHANH - 25 files/batch với convertSimple
    const BATCH_SIZE = 25; // Tăng batch size để nhanh hơn
    const results = [];
    
    for (let i = 0; i < javaFiles.length; i += BATCH_SIZE) {
      const batch = javaFiles.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i/BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(javaFiles.length/BATCH_SIZE);
      
      console.log(`🚀 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)...`);
      
      const batchPromises = batch.map(async (javaFileInfo) => {
        try {
          const javaContent = await fs.readFile(javaFileInfo.fullPath, 'utf8');
          
          if (javaContent.trim().length < 20) {
            return { inputFile: javaFileInfo.relativePath, error: 'Too small', success: false };
          }
          
          // Tính toán relative path cho converter
          const outputRelativePath = javaFileInfo.directory ? 
            path.join(javaFileInfo.directory, path.basename(javaFileInfo.fileName, '.java')) :
            path.basename(javaFileInfo.fileName, '.java');
          
          // Sử dụng convertSimple cho tốc độ cực nhanh
          const typeScriptContent = converter.convertSimple(javaContent);
          
          if (!typeScriptContent || typeScriptContent.trim().length < 20) {
            return { inputFile: javaFileInfo.relativePath, error: 'No content', success: false };
          }
          
          const outputFileName = path.basename(javaFileInfo.fileName, '.java') + '.ts';
          const outputDir = javaFileInfo.directory ? 
            path.join(outputsDir, javaFileInfo.directory) : outputsDir;
          await fs.ensureDir(outputDir);
          
          const outputPath = path.join(outputDir, outputFileName);
          await fs.writeFile(outputPath, typeScriptContent);
          
          return {
            inputFile: javaFileInfo.relativePath,
            outputFile: javaFileInfo.directory ? 
              path.join(javaFileInfo.directory, outputFileName) : outputFileName,
            outputPath: outputPath,
            directory: javaFileInfo.directory,
            success: true
          };
          
        } catch (error) {
          return { inputFile: javaFileInfo.relativePath, error: error.message, success: false };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Ultra fast progress với speed tracking
      const processed = Math.min(i + BATCH_SIZE, javaFiles.length);
      const successCount = results.filter(r => r.success).length;
      const elapsedTime = Date.now() - startTime;
      const speed = processed / (elapsedTime / 1000);
      const estimatedTotal = (elapsedTime / processed) * javaFiles.length;
      const remaining = Math.round((estimatedTotal - elapsedTime) / 1000);
      
      console.log(`🚀 Completed ${processed}/${javaFiles.length} (${successCount} OK) - Speed: ${speed.toFixed(1)} files/s - ETA: ${remaining}s`);
    }
    const successCount = results.filter(r => r.success).length;
    const totalTime = Date.now() - startTime;
    const finalSpeed = javaFiles.length / (totalTime / 1000);
    
    console.log(`🚀 CỰC NHANH completed: ${successCount}/${javaFiles.length} files in ${totalTime}ms (${finalSpeed.toFixed(1)} files/s)`);
    
    res.json({
      success: true,
      message: `Convert All CỰC NHANH: ${successCount}/${javaFiles.length} file thành công`,
      results: results,
      totalFiles: javaFiles.length,
      successCount: successCount,
      processingTime: totalTime,
      speed: finalSpeed.toFixed(1) + ' files/s',
      note: 'Chạy Update Imports riêng nếu cần'
    });
    
  } catch (error) {
    console.error('Convert all error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi trong Convert All', 
      details: error.message 
    });
  }
});

// API endpoint ULTRA FAST - convertSimple
app.post('/convert-simple', async (req, res) => {
  try {
    const examplesDir = path.join(__dirname, '..', 'examples');
    const outputsDir = path.join(__dirname, '..', 'outputs');
    
    await fs.ensureDir(outputsDir);
    
    let javaFiles = await findAllJavaFiles(examplesDir);
    
    // Chỉ skip test files
    javaFiles = javaFiles.filter(file => {
      const fileName = file.fileName.toLowerCase();
      return !fileName.includes('test') && !fileName.endsWith('test.java');
    });
    
    console.log(`🚀 ULTRA FAST Convert: ${javaFiles.length} files`);
    const startTime = Date.now();
    
    const converter = new JavaToTypeScriptConverter();
    
    // XỬ LÝ ULTRA FAST - 15 files/batch với convertSimple
    const BATCH_SIZE = 15; 
    const results = [];
    
    for (let i = 0; i < javaFiles.length; i += BATCH_SIZE) {
      const batch = javaFiles.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i/BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(javaFiles.length/BATCH_SIZE);
      
      console.log(`🚀 Ultra batch ${batchNum}/${totalBatches} (${batch.length} files)...`);
      
      const batchPromises = batch.map(async (javaFileInfo) => {
        try {
          const javaContent = await fs.readFile(javaFileInfo.fullPath, 'utf8');
          
          if (javaContent.trim().length < 50) {
            return { inputFile: javaFileInfo.relativePath, error: 'Too small', success: false };
          }
          
          // Tính toán relative path cho converter  
          const outputRelativePath = javaFileInfo.directory ? 
            path.join(javaFileInfo.directory, path.basename(javaFileInfo.fileName, '.java')) :
            path.basename(javaFileInfo.fileName, '.java');
          
          // Sử dụng convertSimple cho tốc độ cực nhanh
          const typeScriptContent = converter.convertSimple(javaContent);
          
          if (!typeScriptContent || typeScriptContent.trim().length < 20) {
            return { inputFile: javaFileInfo.relativePath, error: 'No content', success: false };
          }
          
          const outputFileName = path.basename(javaFileInfo.fileName, '.java') + '.ts';
          const outputDir = javaFileInfo.directory ? 
            path.join(outputsDir, javaFileInfo.directory) : outputsDir;
          await fs.ensureDir(outputDir);
          
          const outputPath = path.join(outputDir, outputFileName);
          await fs.writeFile(outputPath, typeScriptContent);
          
          return {
            inputFile: javaFileInfo.relativePath,
            outputFile: javaFileInfo.directory ? 
              path.join(javaFileInfo.directory, outputFileName) : outputFileName,
            outputPath: outputPath,
            directory: javaFileInfo.directory,
            success: true
          };
          
        } catch (error) {
          return { inputFile: javaFileInfo.relativePath, error: error.message, success: false };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Ultra fast progress
      const processed = Math.min(i + BATCH_SIZE, javaFiles.length);
      const successCount = results.filter(r => r.success).length;
      const elapsedTime = Date.now() - startTime;
      const speed = processed / (elapsedTime / 1000);
      
      console.log(`🚀 Completed ${processed}/${javaFiles.length} (${successCount} OK) - Speed: ${speed.toFixed(1)} files/s`);
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalTime = Date.now() - startTime;
    const finalSpeed = javaFiles.length / (totalTime / 1000);
    
    console.log(`🚀 ULTRA FAST completed: ${successCount}/${javaFiles.length} files in ${totalTime}ms (${finalSpeed.toFixed(1)} files/s)`);
    
    res.json({
      success: true,
      message: `Ultra Fast Convert: ${successCount}/${javaFiles.length} file thành công`,
      results: results,
      totalFiles: javaFiles.length,
      successCount: successCount,
      processingTime: totalTime,
      speed: finalSpeed.toFixed(1) + ' files/s',
      note: 'Ultra Fast mode với convertSimple'
    });
    
  } catch (error) {
    console.error('Ultra fast convert error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi trong Ultra Fast Convert', 
      details: error.message 
    });
  }
});

// API endpoint SMART IMPORTS - Full convert với smart imports
app.post('/convert-smart', async (req, res) => {
  try {
    const examplesDir = path.join(__dirname, '..', 'examples');
    const outputsDir = path.join(__dirname, '..', 'outputs');
    
    await fs.ensureDir(outputsDir);
    
    let javaFiles = await findAllJavaFiles(examplesDir);
    
    // Chỉ skip test files
    javaFiles = javaFiles.filter(file => {
      const fileName = file.fileName.toLowerCase();
      return !fileName.includes('test') && !fileName.endsWith('test.java');
    });
    
    console.log(`🧠 SMART IMPORTS Convert: ${javaFiles.length} files`);
    const startTime = Date.now();
    
    const converter = new JavaToTypeScriptConverter();
    
    // XỬ LÝ SMART - 20 files/batch với optimized convert + smart imports
    const BATCH_SIZE = 20; // Tăng batch size để nhanh hơn
    const results = [];
    
    for (let i = 0; i < javaFiles.length; i += BATCH_SIZE) {
      const batch = javaFiles.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i/BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(javaFiles.length/BATCH_SIZE);
      
      console.log(`🧠 Smart batch ${batchNum}/${totalBatches} (${batch.length} files)...`);
      
      const batchPromises = batch.map(async (javaFileInfo) => {
        try {
          const javaContent = await fs.readFile(javaFileInfo.fullPath, 'utf8');
          
          if (javaContent.trim().length < 20) {
            return { inputFile: javaFileInfo.relativePath, error: 'Too small', success: false };
          }
          
          // Tính toán relative path cho smart imports
          const outputRelativePath = javaFileInfo.directory ? 
            path.join(javaFileInfo.directory, path.basename(javaFileInfo.fileName, '.java')) :
            path.basename(javaFileInfo.fileName, '.java');
          
          // Sử dụng convertSimple với smart imports (nhanh + chính xác)
          const typeScriptContent = converter.convertSimple(javaContent, outputRelativePath);
          
          if (!typeScriptContent || typeScriptContent.trim().length < 20) {
            return { inputFile: javaFileInfo.relativePath, error: 'No content', success: false };
          }
          
          const outputFileName = path.basename(javaFileInfo.fileName, '.java') + '.ts';
          const outputDir = javaFileInfo.directory ? 
            path.join(outputsDir, javaFileInfo.directory) : outputsDir;
          await fs.ensureDir(outputDir);
          
          const outputPath = path.join(outputDir, outputFileName);
          await fs.writeFile(outputPath, typeScriptContent);
          
          return {
            inputFile: javaFileInfo.relativePath,
            outputFile: javaFileInfo.directory ? 
              path.join(javaFileInfo.directory, outputFileName) : outputFileName,
            outputPath: outputPath,
            directory: javaFileInfo.directory,
            success: true
          };
          
        } catch (error) {
          return { inputFile: javaFileInfo.relativePath, error: error.message, success: false };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Smart progress
      const processed = Math.min(i + BATCH_SIZE, javaFiles.length);
      const successCount = results.filter(r => r.success).length;
      const elapsedTime = Date.now() - startTime;
      const speed = processed / (elapsedTime / 1000);
      
      console.log(`🧠 Completed ${processed}/${javaFiles.length} (${successCount} OK) - Speed: ${speed.toFixed(1)} files/s`);
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalTime = Date.now() - startTime;
    const finalSpeed = javaFiles.length / (totalTime / 1000);
    
    console.log(`🧠 SMART IMPORTS completed: ${successCount}/${javaFiles.length} files in ${totalTime}ms (${finalSpeed.toFixed(1)} files/s)`);
    
    res.json({
      success: true,
      message: `Smart Convert: ${successCount}/${javaFiles.length} file thành công`,
      results: results,
      totalFiles: javaFiles.length,
      successCount: successCount,
      processingTime: totalTime,
      speed: finalSpeed.toFixed(1) + ' files/s',
      note: 'Smart imports với relative paths chính xác'
    });
    
  } catch (error) {
    console.error('Smart convert error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi trong Smart Convert', 
      details: error.message 
    });
  }
});

// Helper function để tìm tất cả file .ts
async function findAllTsFiles(dir, baseDir = dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      const subFiles = await findAllTsFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (item.name.endsWith('.ts')) {
      const relativePath = path.relative(baseDir, fullPath);
      const relativeDir = path.dirname(relativePath);
      
      files.push({
        fullPath: fullPath,
        relativePath: relativePath,
        fileName: item.name,
        directory: relativeDir === '.' ? '' : relativeDir
      });
    }
  }
  
  return files;
}

// Endpoint riêng để update imports
app.post('/update-imports', async (req, res) => {
  try {
    const outputsDir = path.join(__dirname, '..', 'outputs');
    
    const tsFiles = await findAllTsFiles(outputsDir);
    
    if (tsFiles.length === 0) {
      return res.json({
        success: false,
        error: 'Không tìm thấy file .ts nào để update imports'
      });
    }
    
    console.log(`Updating imports for ${tsFiles.length} TypeScript files...`);
    const startTime = Date.now();
    
    // Build interface map cho tất cả files
    const interfaceMap = {};
    
    // Scan tất cả files để tìm interface names
    for (const tsFile of tsFiles) {
      try {
        const content = await fs.readFile(tsFile.fullPath, 'utf8');
        const interfaceMatch = content.match(/export interface (\w+)/);
        if (interfaceMatch) {
          const interfaceName = interfaceMatch[1];
          const fileName = path.basename(tsFile.fileName, '.ts');
          interfaceMap[interfaceName] = {
            fileName: fileName,
            directory: tsFile.directory
          };
        }
      } catch (error) {
        console.error(`Error reading ${tsFile.fullPath}:`, error.message);
      }
    }
    
    console.log(`Found ${Object.keys(interfaceMap).length} interfaces`);
    
    // Update imports cho từng file
    let updatedCount = 0;
    for (const tsFile of tsFiles) {
      try {
        const content = await fs.readFile(tsFile.fullPath, 'utf8');
        let updatedContent = content;
        let hasChanges = false;
        
        // Tìm extends clause
        const extendsMatch = content.match(/extends\s+(\w+)/);
        if (extendsMatch) {
          const parentClass = extendsMatch[1];
          if (interfaceMap[parentClass] && !content.includes(`import { ${parentClass} }`)) {
            const parentInfo = interfaceMap[parentClass];
            
            // Tính relative path
            let importPath;
            if (tsFile.directory === parentInfo.directory) {
              importPath = `./${parentInfo.fileName}`;
            } else if (tsFile.directory === '') {
              importPath = `./${parentInfo.directory.replace(/\\/g, '/')}/${parentInfo.fileName}`;
            } else if (parentInfo.directory === '') {
              const levels = tsFile.directory.split(path.sep).length;
              importPath = `${'../'.repeat(levels)}${parentInfo.fileName}`;
            } else {
              const levels = tsFile.directory.split(path.sep).length;
              importPath = `${'../'.repeat(levels)}${parentInfo.directory.replace(/\\/g, '/')}/${parentInfo.fileName}`;
            }
            
            const importLine = `import { ${parentClass} } from '${importPath}';\n\n`;
            updatedContent = importLine + content;
            hasChanges = true;
          }
        }
        
        if (hasChanges) {
          await fs.writeFile(tsFile.fullPath, updatedContent);
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating ${tsFile.fullPath}:`, error.message);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Import update completed: ${updatedCount} files updated in ${totalTime}ms`);
    
    res.json({
      success: true,
      message: `Đã update imports cho ${updatedCount}/${tsFiles.length} file TypeScript`,
      totalFiles: tsFiles.length,
      updatedFiles: updatedCount,
      processingTime: totalTime
    });
    
  } catch (error) {
    console.error('Update imports error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi trong update imports', 
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  console.log('Java to TypeScript Converter - OPTIMIZED VERSION');
});

module.exports = app;
