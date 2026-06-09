/**
 * 工具函数模块
 * 提供 snake_case 到 camelCase 的双向转换等通用功能
 */

// 将 snake_case 字符串转为 camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// 将 camelCase 字符串转为 snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

// 递归将对象的 key 从 snake_case 转为 camelCase
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(toCamelCase)
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {}
    for (const key of Object.keys(obj)) {
      result[snakeToCamel(key)] = toCamelCase(obj[key])
    }
    return result
  }
  return obj
}

// 递归将对象的 key 从 camelCase 转为 snake_case
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(toSnakeCase)
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {}
    for (const key of Object.keys(obj)) {
      result[camelToSnake(key)] = toSnakeCase(obj[key])
    }
    return result
  }
  return obj
}
