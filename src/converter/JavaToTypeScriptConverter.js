class JavaToTypeScriptConverter {
  constructor() {
    this.javaToTsTypeMap = {
      'String': 'string',
      'int': 'number',
      'Integer': 'number',
      'long': 'number',
      'Long': 'number',
      'double': 'number',
      'Double': 'number',
      'float': 'number',
      'Float': 'number',
      'boolean': 'boolean',
      'Boolean': 'boolean',
      'char': 'string',
      'Character': 'string',
      'byte': 'number',
      'Byte': 'number',
      'short': 'number',
      'Short': 'number',
      'Object': 'any',
      'void': 'void',
      'Date': 'Date',
      'LocalDate': 'Date',
      'LocalDateTime': 'Date',
      'BigDecimal': 'number',
      'BigInteger': 'number',
      'UUID': 'string'
    };

    // Custom types that need imports (không add vào map trên)
    this.customTypes = new Set(['EntityRef', 'TimePeriod', 'AbstractCatalogEntity', 'AbstractEntity', 'AbstractEntityRef']);
    
    // Cache for processed results
    this.cache = new Map();
    
    // Cache for smart imports to speed up
    this.importCache = new Map();
  }

  convertSimple(javaCode, currentFilePath = null) {
    // Ultra-fast simple conversion for bulk processing
    if (!javaCode || javaCode.trim().length < 20) {
      return null;
    }
    
    // Quick skip patterns
    if (javaCode.includes('public static void main') ||
        javaCode.includes('@Test') ||
        javaCode.includes('extends Exception')) {
      return `// Skipped: Not suitable for interface conversion\n`;
    }
    
    // Extract class or enum name với logic cải thiện
    const classPattern = /(?:public\s+|private\s+|protected\s+)?(?:abstract\s+)?(?:final\s+)?(class|enum)\s+([A-Z][a-zA-Z0-9_]*)/;
    const classMatch = javaCode.match(classPattern);
    
    if (!classMatch) {
      return `// No valid class or enum found\n`;
    }
    
    const typeKeyword = classMatch[1]; // 'class' or 'enum'
    const className = classMatch[2];
    
    // Validate class/enum name
    const javaKeywords = ['Class', 'Interface', 'Abstract', 'Final', 'Public', 'Private', 'Protected', 'Static'];
    if (javaKeywords.includes(className) || !/^[A-Z][a-zA-Z0-9_]*$/.test(className)) {
      return `// Invalid ${typeKeyword} name: ${className}\n`;
    }
    
    // Handle Java enum conversion
    if (typeKeyword === 'enum') {
      return this.convertEnumToTypeScript(javaCode, className, currentFilePath);
    }
    
    // Extract extends với validation
    const extendsPattern = /class\s+[A-Z][a-zA-Z0-9_]*\s+extends\s+([A-Z][a-zA-Z0-9_]*)/;
    const extendsMatch = javaCode.match(extendsPattern);
    const extendsClause = (extendsMatch && /^[A-Z][a-zA-Z0-9_]*$/.test(extendsMatch[1])) ? 
      ` extends ${extendsMatch[1]}` : '';
    
    // Enhanced field extraction with @JsonProperty support
    const fieldPattern = /(?:@JsonProperty\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']\s*\)\s*)?private\s+(?!static\s+final|final\s+static)([A-Za-z][a-zA-Z0-9_<>\[\],\s]*)\s+([a-z][a-zA-Z0-9_]*)\s*[;=]/g;
    
    let properties = '';
    const processedFields = new Set();
    const dependencies = new Set();
    let fieldMatch;
    
    while ((fieldMatch = fieldPattern.exec(javaCode)) !== null) {
      const jsonPropertyName = fieldMatch[1]; // "@type", "@baseType", etc.
      const javaType = fieldMatch[2].trim();
      const fieldName = fieldMatch[3];
      
      // Skip serialVersionUID và validation
      if (fieldName === 'serialVersionUID' || processedFields.has(fieldName)) {
        continue;
      }
      
      // Validate field name (phải bắt đầu bằng chữ thường)
      if (!/^[a-z][a-zA-Z0-9_]*$/.test(fieldName)) {
        continue;
      }
      
      // Determine actual field name for TypeScript
      let tsFieldName = fieldName;
      if (jsonPropertyName) {
        // Use name from @JsonProperty annotation
        if (jsonPropertyName.includes('@') || jsonPropertyName.includes('-') || jsonPropertyName.includes('.')) {
          tsFieldName = `"${jsonPropertyName}"`;
        } else {
          tsFieldName = jsonPropertyName;
        }
      }
      
      processedFields.add(fieldName);
      
      let tsType = this.convertJavaTypeToTS(javaType);
      properties += `  ${tsFieldName}?: ${tsType};\n`;
      
      // Enhanced dependency collection for smart imports
      if (currentFilePath) {
        this.collectTypeDependencies(tsType, dependencies);
        // Also check the original Java type for custom types
        this.collectTypeDependencies(javaType, dependencies);
      }
    }
    
    // Add extends to dependencies
    if (extendsMatch && !this.isBuiltInType(extendsMatch[1])) {
      dependencies.add(extendsMatch[1]);
    }
    
    // Generate smart imports if path provided
    let imports = '';
    if (currentFilePath && dependencies.size > 0) {
      const importStatements = this.generateSmartImports([...dependencies], currentFilePath);
      if (importStatements.length > 0) {
        imports = importStatements.join('\n') + '\n\n';
      }
    }
    
    // Build simple interface
    let tsInterface = `${imports}export interface ${className}${extendsClause} {\n`;
    if (properties.trim()) {
      tsInterface += properties;
    }
    tsInterface += `}\n`;
    
    return tsInterface;
  }

  convert(javaCode, currentFilePath = null) {
    // Quick validation - lower threshold for simple classes
    if (!javaCode || javaCode.trim().length < 20) {
      return null;
    }
    
    // Check cache first
    const cacheKey = this.generateCacheKey(javaCode + (currentFilePath || ''));
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Convert thành interface TypeScript đầy đủ
    let tsInterface = this.convertToInterface(javaCode, currentFilePath);
    
    // Cache result only if meaningful content
    if (tsInterface && tsInterface.trim().length > 20) {
      this.cache.set(cacheKey, tsInterface);
    }
    
    return tsInterface;
  }
  
  generateCacheKey(javaCode) {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < javaCode.length; i++) {
      const char = javaCode.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  convertToInterface(javaCode, currentFilePath = null) {
    // Trích xuất tên class
    const className = this.extractClassName(javaCode);
    
    // Trích xuất extends clause
    const extendsClass = this.extractExtendsClass(javaCode);
    
    // Trích xuất các fields/properties
    const properties = this.extractProperties(javaCode);
    
    // Tìm các dependencies (custom types được sử dụng)
    const dependencies = this.findDependencies(properties);
    
    // Thêm extends class vào dependencies nếu có
    if (extendsClass && !this.isBuiltInType(extendsClass)) {
      dependencies.push(extendsClass);
    }
    
    // Tạo import statements với smart path calculation
    let imports = '';
    if (dependencies.length > 0) {
      // Remove duplicates
      const uniqueDeps = [...new Set(dependencies)];
      const importStatements = this.generateSmartImports(uniqueDeps, currentFilePath);
      if (importStatements.length > 0) {
        imports = importStatements.join('\n') + '\n\n';
      }
    }
    
    // Tạo TypeScript interface với extends nếu có
    const extendsClause = extendsClass ? ` extends ${extendsClass}` : '';
    let interfaceCode = `${imports}export interface ${className}${extendsClause} {\n`;
    
    properties.forEach(prop => {
      const tsType = this.javaToTsTypeMap[prop.type] || prop.type;
      const optional = prop.isOptional ? '?' : '';
      
      // Nếu field name có quotes, không thêm space trước colon
      if (prop.name.startsWith('"') && prop.name.endsWith('"')) {
        interfaceCode += `  ${prop.name}${optional}: ${tsType};\n`;
      } else {
        interfaceCode += `  ${prop.name}${optional}: ${tsType};\n`;
      }
    });
    
    interfaceCode += '}\n';
    
    return interfaceCode;
  }

  findDependencies(properties) {
    const dependencies = new Set();
    
    properties.forEach(prop => {
      const type = prop.type;
      
      // Kiểm tra nếu type là custom type (không phải built-in type)
      if (!this.isBuiltInType(type)) {
        // Xử lý array types
        if (type.endsWith('[]')) {
          const baseType = type.slice(0, -2);
          if (!this.isBuiltInType(baseType)) {
            dependencies.add(baseType);
          }
        }
        // Xử lý generic types
        else if (type.includes('<') && type.includes('>')) {
          const match = type.match(/<([^>]+)>/);
          if (match) {
            const innerTypes = this.parseGenericTypes(match[1]);
            innerTypes.forEach(innerType => {
              if (!this.isBuiltInType(innerType)) {
                dependencies.add(innerType);
              }
            });
          }
        }
        // Type đơn giản
        else {
          dependencies.add(type);
        }
      }
    });
    
    return Array.from(dependencies);
  }
  
  generateSmartImports(dependencies, currentFilePath = null) {
    // Cache key for imports
    const cacheKey = `${dependencies.join(',')}_${currentFilePath}`;
    if (this.importCache.has(cacheKey)) {
      return this.importCache.get(cacheKey);
    }
    
    const imports = [];
    
    // Định nghĩa type location mapping theo cấu trúc dự án
    const typeLocationMap = {
      // Base types in utils/base
      'AbstractEntity': 'utils/base/AbstractEntity',
      'AbstractEntityRef': 'utils/base/AbstractEntityRef', 
      'AbstractCatalogEntity': 'utils/base/AbstractCatalogEntity',
      'EntityRef': 'utils/base/EntityRef',
      'TimePeriod': 'utils/base/TimePeriod',
      'Money': 'utils/base/Money',
      'Quantity': 'utils/base/Quantity',
      'Duration': 'utils/base/Duration',
      'Note': 'utils/base/Note',
      'RelatedParty': 'utils/base/RelatedParty',
      'Attachment': 'utils/base/Attachment',
      'Event': 'utils/base/Event',
      
      // Common types
      'Characteristic': 'entity/common/Characteristic',
      'CharacteristicSpecification': 'entity/common/CharacteristicSpecification',
      'CharacteristicValueSpecification': 'entity/common/CharacteristicValueSpecification',
      'Association': 'entity/common/Association',
      'AssociationRole': 'entity/common/AssociationRole',
      'EntitySpecification': 'entity/common/EntitySpecification',
      'EntityRelationship': 'entity/common/EntityRelationship',
      'EntityCategory': 'entity/common/EntityCategory',
      'ExternalReference': 'entity/common/ExternalReference',
      'ApplicableTimePeriod': 'entity/common/ApplicableTimePeriod',
      'ContactMedium': 'entity/common/ContactMedium',
      'GeographicAddress': 'entity/common/GeographicAddress',
      'Addressable': 'entity/common/Addressable',
    };
    
    dependencies.forEach(dep => {
      // Skip built-in types
      if (this.isBuiltInType(dep)) {
        return;
      }
      
      let importPath;
      
      if (typeLocationMap[dep]) {
        // Use predefined location
        const targetPath = typeLocationMap[dep];
        if (currentFilePath) {
          importPath = this.calculateRelativePath(currentFilePath, targetPath);
        } else {
          importPath = `./${dep}`; // fallback
        }
      } else {
        // Fallback: assume same directory
        importPath = `./${dep}`;
      }
      
      imports.push(`import { ${dep} } from '${importPath}';`);
    });
    
    // Cache result
    this.importCache.set(cacheKey, imports);
    return imports;
  }
  
  calculateRelativePath(currentPath, targetPath) {
    if (!currentPath) {
      return `./${targetPath}`;
    }
    
    // Extract directory từ current path
    // currentPath: "entity/customize/CharacteristicCatalog"
    // targetPath: "utils/base/AbstractEntity"
    
    const currentDir = currentPath.includes('/') ? currentPath.substring(0, currentPath.lastIndexOf('/')) : '';
    const currentDepth = currentDir ? currentDir.split('/').length : 0;
    
    // Tính số level cần lên
    let relativePath = '';
    for (let i = 0; i < currentDepth; i++) {
      relativePath += '../';
    }
    
    return relativePath + targetPath;
  }

  isBuiltInType(type) {
    const builtInTypes = [
      'string', 'number', 'boolean', 'Date', 'any', 'void', 'undefined', 'null',
      // Java collections that convert to built-in types
      'List', 'ArrayList', 'Set', 'HashSet', 'Map', 'HashMap', 'Collection',
      // Common Java types
      'Object', 'Class'
    ];
    
    // Check built-in types và Java to TS type mapping
    return builtInTypes.includes(type) || this.javaToTsTypeMap.hasOwnProperty(type);
  }

  extractClassName(javaCode) {
    // Loại bỏ comments trước khi extract class/enum name
    const codeWithoutComments = this.removeComments(javaCode);
    
    // Pattern chính xác để tìm class hoặc enum declaration
    const classPattern = /(?:public\s+|private\s+|protected\s+)?(?:abstract\s+)?(?:final\s+)?(class|enum)\s+([A-Z][a-zA-Z0-9_]*)/g;
    
    let className = null;
    let match;
    
    // Tìm tất cả matches và lấy class/enum name hợp lệ cuối cùng
    while ((match = classPattern.exec(codeWithoutComments)) !== null) {
      const candidateName = match[2]; // group 2 is the name, group 1 is class/enum
      
      // Validate: class/enum name phải bắt đầu bằng chữ hoa và không phải keyword
      const javaKeywords = ['Class', 'Interface', 'Abstract', 'Final', 'Public', 'Private', 'Protected', 'Static'];
      
      if (candidateName && 
          candidateName.length > 1 && 
          /^[A-Z][a-zA-Z0-9_]*$/.test(candidateName) &&
          !javaKeywords.includes(candidateName)) {
        className = candidateName;
      }
    }
    
    return className || 'UnknownClass';
  }

  extractExtendsClass(javaCode) {
    // Loại bỏ comments trước khi extract extends
    const codeWithoutComments = this.removeComments(javaCode);
    
    // Pattern để tìm extends clause
    const extendsPattern = /class\s+[A-Z][a-zA-Z0-9_]*\s+extends\s+([A-Z][a-zA-Z0-9_]*)/;
    const match = codeWithoutComments.match(extendsPattern);
    
    if (match) {
      const extendsClass = match[1];
      
      // Validate extends class name
      if (/^[A-Z][a-zA-Z0-9_]*$/.test(extendsClass)) {
        return extendsClass;
      }
    }
    
    return null; // Không có extends hoặc không hợp lệ
  }

  removeComments(code) {
    // Optimized: Single regex to remove all comment types at once
    let cleanCode = code.replace(/(?:\/\/.*$|\/\*[\s\S]*?\*\/|\/\*\*[\s\S]*?\*\/)/gm, '');
    
    // Remove static final fields (serialVersionUID, constants, etc.)
    cleanCode = cleanCode.replace(/private\s+(?:static\s+final|final\s+static)\s+[^;]+;/g, '');
    
    return cleanCode;
  }

  extractProperties(javaCode) {
    const properties = [];
    const usedFields = new Set();
    
    // Process @JsonProperty fields first with higher priority
    const jsonPropertyPattern = /(?:@\w+[^@]*?)*@JsonProperty\s*\(\s*(?:value\s*=\s*)?"([^"]+)"\s*\)[^@]*?private\s+([A-Za-z0-9_<>\[\],\s]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=[^;]+)?;/gms;
    
    let jsonPropertyMatch;
    while ((jsonPropertyMatch = jsonPropertyPattern.exec(javaCode)) !== null) {
      const jsonPropertyName = jsonPropertyMatch[1]; // "@type", "@baseType", etc.
      const javaType = jsonPropertyMatch[2].trim();
      const javaFieldName = jsonPropertyMatch[3]; // atType, atBaseType, etc.
      
      if (javaFieldName === 'serialVersionUID' || usedFields.has(javaFieldName)) continue;
      usedFields.add(javaFieldName);
      
      let tsType = this.convertJavaTypeToTS(javaType);
      let fieldName = jsonPropertyName;
      
      // Wrap special characters in quotes for TypeScript
      if (fieldName.includes('@') || fieldName.includes('-') || fieldName.includes('.') || /[^a-zA-Z0-9_]/.test(fieldName)) {
        fieldName = `"${fieldName}"`;
      }
      
      properties.push({
        name: fieldName,
        type: tsType,
        isOptional: true, // Make all properties optional by default
        originalJavaName: javaFieldName,
        jsonPropertyName: jsonPropertyName
      });
    }
    
    // Process remaining private fields without @JsonProperty
    const regularFieldPattern = /(?<!@JsonProperty[^@]*?)(?:@\w+(?:\([^)]*\))?\s*)*?private\s+(?!static\s+final|final\s+static)([A-Za-z0-9_<>\[\],\s]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=[^;]+)?;/gms;
    
    let regularMatch;
    while ((regularMatch = regularFieldPattern.exec(javaCode)) !== null) {
      const javaType = regularMatch[1].trim();
      const fieldName = regularMatch[2];
      
      if (fieldName === 'serialVersionUID' || usedFields.has(fieldName)) continue;
      usedFields.add(fieldName);
      
      let tsType = this.convertJavaTypeToTS(javaType);
      
      properties.push({
        name: fieldName,
        type: tsType,
        isOptional: true, // Make all properties optional by default
        originalJavaName: fieldName
      });
    }
    
    return this.removeDuplicateProperties(properties);
  }

  removeDuplicateProperties(properties) {
    const seen = new Set();
    return properties.filter(prop => {
      const key = prop.name + ':' + prop.type;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  convertJavaTypeToTS(javaType) {
    // Clean up whitespace
    javaType = javaType.trim();
    
    // Xử lý arrays
    if (javaType.endsWith('[]')) {
      const baseType = javaType.slice(0, -2).trim();
      const tsBaseType = this.convertJavaTypeToTS(baseType);
      return `${tsBaseType}[]`;
    }
    
    // Xử lý generic types
    if (javaType.includes('<')) {
      const genericMatch = javaType.match(/^([A-Za-z0-9_]+)<(.+)>$/);
      if (genericMatch) {
        const containerType = genericMatch[1];
        const innerType = genericMatch[2].trim();
        
        if (containerType === 'List' || containerType === 'ArrayList' || containerType === 'Set' || containerType === 'Collection') {
          const tsInnerType = this.convertJavaTypeToTS(innerType);
          return `${tsInnerType}[]`;
        }
        
        if (containerType === 'Map' || containerType === 'HashMap') {
          // Parse multiple generic parameters
          const types = this.parseGenericTypes(innerType);
          if (types.length >= 2) {
            const keyType = this.convertJavaTypeToTS(types[0]);
            const valueType = this.convertJavaTypeToTS(types[1]);
            return `{ [key: ${keyType}]: ${valueType} }`;
          }
        }
        
        if (containerType === 'Optional') {
          const tsInnerType = this.convertJavaTypeToTS(innerType);
          return `${tsInnerType} | undefined`;
        }
        
        // For other generic types, keep as is but convert inner types
        const tsInnerType = this.convertJavaTypeToTS(innerType);
        return `${containerType}<${tsInnerType}>`;
      }
    }
    
    // Convert standard types
    const mappedType = this.javaToTsTypeMap[javaType];
    if (mappedType) {
      return mappedType;
    }
    
    // Giữ nguyên custom types
    return javaType;
  }

  parseGenericTypes(genericString) {
    const types = [];
    let depth = 0;
    let current = '';
    
    for (let i = 0; i < genericString.length; i++) {
      const char = genericString[i];
      
      if (char === '<') {
        depth++;
        current += char;
      } else if (char === '>') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        types.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      types.push(current.trim());
    }
    
    return types;
  }

  convertImports(code) {
    // Convert Java imports to TypeScript imports
    return code.replace(/import\s+java\.[^;]+;/g, '')
              .replace(/import\s+([a-zA-Z0-9_.]+)\.([a-zA-Z0-9_]+);/g, 'import { $2 } from \'$1\';')
              .replace(/import\s+static\s+([^;]+);/g, '// Static import: $1');
  }

  convertPackage(code) {
    // Remove package declarations (TypeScript uses modules)
    return code.replace(/package\s+[^;]+;/g, '// Package converted to module');
  }

  convertClassDeclarations(code) {
    // Convert class declarations
    return code.replace(/public\s+class\s+(\w+)/g, 'export class $1')
              .replace(/class\s+(\w+)\s+extends\s+(\w+)/g, 'class $1 extends $2')
              .replace(/class\s+(\w+)\s+implements\s+([^{]+)/g, 'class $1 implements $2');
  }

  convertMethods(code) {
    // Convert method declarations
    code = code.replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*{/g, 'export function main(): void {');
    code = code.replace(/public\s+(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{/g, 'public $2($3): $1 {');
    code = code.replace(/private\s+(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{/g, 'private $2($3): $1 {');
    code = code.replace(/protected\s+(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{/g, 'protected $2($3): $1 {');
    
    return code;
  }

  convertVariables(code) {
    // Convert variable declarations
    code = code.replace(/(\w+)\s+(\w+)\s*=/g, 'let $2: $1 =');
    code = code.replace(/final\s+(\w+)\s+(\w+)\s*=/g, 'const $2: $1 =');
    
    return code;
  }

  convertDataTypes(code) {
    // Convert Java types to TypeScript types
    Object.keys(this.javaToTsTypeMap).forEach(javaType => {
      const tsType = this.javaToTsTypeMap[javaType];
      const regex = new RegExp(`\\b${javaType}\\b`, 'g');
      code = code.replace(regex, tsType);
    });
    
    // Convert generic types
    code = code.replace(/List<(\w+)>/g, '$1[]');
    code = code.replace(/ArrayList<(\w+)>/g, '$1[]');
    code = code.replace(/Map<(\w+),\s*(\w+)>/g, 'Map<$1, $2>');
    
    return code;
  }

  convertAnnotations(code) {
    // Convert common Java annotations to TypeScript decorators
    code = code.replace(/@Override/g, '// @Override');
    code = code.replace(/@Autowired/g, '// @Autowired - Use dependency injection');
    code = code.replace(/@Component/g, '// @Component');
    code = code.replace(/@Service/g, '// @Service');
    code = code.replace(/@Repository/g, '// @Repository');
    code = code.replace(/@Entity/g, '// @Entity');
    
    return code;
  }

  convertAccessModifiers(code) {
    // TypeScript access modifiers are similar but handle differently
    return code;
  }

  convertConstructors(code) {
    // Convert constructors
    code = code.replace(/public\s+(\w+)\s*\(([^)]*)\)\s*{/g, 'constructor($2) {');
    
    return code;
  }

  convertCollections(code) {
    // Convert Java collections to TypeScript arrays/collections
    code = code.replace(/new\s+ArrayList<(\w+)>\(\)/g, 'new Array<$1>()');
    code = code.replace(/new\s+HashMap<(\w+),\s*(\w+)>\(\)/g, 'new Map<$1, $2>()');
    code = code.replace(/\.add\(/g, '.push(');
    code = code.replace(/\.put\(/g, '.set(');
    code = code.replace(/\.get\(/g, '.get(');
    
    return code;
  }

  convertStringConcatenation(code) {
    // Convert string concatenation to template literals where appropriate
    return code;
  }

  addTypeScriptImports(code) {
    // Add necessary TypeScript imports
    let imports = '';
    
    if (code.includes('Map<')) {
      // Map is built-in in TypeScript
    }
    
    if (code.includes('Promise<')) {
      // Promise is built-in in TypeScript
    }
    
    return imports + code;
  }

  // Enhanced method to collect all type dependencies
  collectTypeDependencies(typeString, dependencies) {
    if (!typeString || this.isBuiltInType(typeString)) {
      return;
    }

    // Handle arrays
    if (typeString.endsWith('[]')) {
      const baseType = typeString.slice(0, -2);
      this.collectTypeDependencies(baseType, dependencies);
      return;
    }

    // Handle generics like List<EntityRef>, Map<String, AbstractEntity>
    if (typeString.includes('<')) {
      const match = typeString.match(/^([^<]+)<(.+)>$/);
      if (match) {
        const containerType = match[1].trim();
        const innerTypes = this.parseGenericTypes(match[2]);
        
        // Add container type if it's custom
        if (!this.isBuiltInType(containerType)) {
          dependencies.add(containerType);
        }
        
        // Add inner types
        innerTypes.forEach(type => {
          this.collectTypeDependencies(type, dependencies);
        });
      }
      return;
    }

    // Handle comma-separated types
    if (typeString.includes(',')) {
      typeString.split(',').forEach(type => {
        this.collectTypeDependencies(type.trim(), dependencies);
      });
      return;
    }

    // Single type - add if it's custom
    const cleanType = typeString.trim();
    if (cleanType && !this.isBuiltInType(cleanType) && /^[A-Z][a-zA-Z0-9_]*$/.test(cleanType)) {
      dependencies.add(cleanType);
    }
  }

  convertEnumToTypeScript(javaCode, enumName, currentFilePath = null) {
    // Extract enum values - improved pattern
    const enumValues = [];
    
    // Find the enum body
    const enumBodyMatch = javaCode.match(/enum\s+\w+\s*\{([^}]+)\}/s);
    if (!enumBodyMatch) {
      return `// Could not parse enum body\n`;
    }
    
    const enumBody = enumBodyMatch[1];
    
    // Pattern to match enum constants: CONSTANT_NAME("value") or CONSTANT_NAME
    // This will match constants before the semicolon
    const enumPattern = /([A-Z_][A-Z0-9_]*)\s*(?:\(\s*"([^"]+)"\s*\))?(?:\s*,|\s*;)/g;
    
    let match;
    while ((match = enumPattern.exec(enumBody)) !== null) {
      const constantName = match[1];
      const constantValue = match[2] || constantName.toLowerCase();
      
      // Validate that it's a proper enum constant
      if (constantName && /^[A-Z_][A-Z0-9_]*$/.test(constantName)) {
        enumValues.push({
          name: constantName,
          value: constantValue
        });
      }
    }
    
    // Generate TypeScript enum
    let tsEnum = `export enum ${enumName} {\n`;
    
    if (enumValues.length === 0) {
      tsEnum += `  // No enum values found\n`;
    } else {
      enumValues.forEach((enumValue, index) => {
        const isLast = index === enumValues.length - 1;
        tsEnum += `  ${enumValue.name} = "${enumValue.value}"${isLast ? '' : ','}\n`;
      });
    }
    
    tsEnum += `}\n`;
    
    return tsEnum;
  }
}

module.exports = JavaToTypeScriptConverter;
