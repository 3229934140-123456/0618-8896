import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

interface Row { [key: string]: unknown }

class InMemoryDB {
  private tables: Map<string, Row[]> = new Map()
  private autoIncrement: Map<string, number> = new Map()

  exec(sql: string): void {
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)
    for (const stmt of statements) {
      this.execSingle(stmt)
    }
  }

  private execSingle(sql: string): void {
    const upper = sql.toUpperCase().trim()
    if (!upper.startsWith('CREATE TABLE')) return

    const tableNameMatch = sql.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i)
      || sql.match(/CREATE\s+TABLE\s+(\w+)/i)
    if (!tableNameMatch) return

    const tableName = tableNameMatch[1]
    this.tables.set(tableName, [])
  }

  prepare(sql: string) {
    return new PreparedStmt(this, sql)
  }

  transaction<T extends (...args: unknown[]) => unknown>(fn: T): T {
    return fn
  }

  pragma(_s: string): void {}

  getTable(name: string): Row[] {
    if (!this.tables.has(name)) {
      this.tables.set(name, [])
    }
    return this.tables.get(name)!
  }
}

class PreparedStmt {
  constructor(private db: InMemoryDB, private sql: string) {}

  get(...params: unknown[]): Row | undefined {
    const result = this._execute(params)
    return result.length > 0 ? result[0] : undefined
  }

  all(...params: unknown[]): Row[] {
    return this._execute(params)
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const upper = this.sql.toUpperCase().trim()

    if (upper.startsWith('INSERT')) {
      return this._insert(params)
    }
    if (upper.startsWith('UPDATE')) {
      return this._update(params)
    }
    if (upper.startsWith('DELETE')) {
      return this._delete(params)
    }

    return { changes: 0, lastInsertRowid: 0 }
  }

  private _execute(params: unknown[]): Row[] {
    const upper = this.sql.toUpperCase().trim()

    if (upper.startsWith('SELECT')) {
      return this._select(params)
    }

    return []
  }

  private _select(params: unknown[]): Row[] {
    const { tableName, joins, whereClause, whereParams, selectFields, orderBy, groupBy, havingClause, havingParams } = this._parseSelect()

    let rows: Row[] = []

    if (joins.length > 0) {
      rows = this._selectWithJoins(tableName, joins, params)
    } else {
      rows = [...this.db.getTable(tableName)]
    }

    if (whereClause && whereParams.length > 0) {
      rows = this._applyWhere(rows, whereClause, whereParams)
    }

    if (groupBy) {
      rows = this._applyGroupBy(rows, groupBy, havingClause, havingParams)
    }

    if (selectFields && selectFields !== '*' && !selectFields.match(/^\w+\.\*$/)) {
      rows = this._applySelectFields(rows, selectFields)
    }

    if (orderBy) {
      rows = this._applyOrderBy(rows, orderBy)
    }

    return rows
  }

  private _parseSelect() {
    const sql = this.sql

    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+(\w+))?/i)
    const selectFields = selectMatch ? selectMatch[1] : '*'
    const tableName = selectMatch ? selectMatch[2] : ''

    const joinMatches = [...sql.matchAll(/JOIN\s+(\w+)(?:\s+(\w+))?\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi)]
    const joins = joinMatches.map(m => ({ table: m[1], alias: m[2] || m[1], leftCol: m[3], rightCol: m[4] }))

    const whereMatch = sql.match(/WHERE\s+(.*?)(?:\s+ORDER BY|\s+GROUP BY|\s+HAVING|$)/i)
    const whereClause = whereMatch ? whereMatch[1] : ''
    const whereParams: unknown[] = []

    const groupByMatch = sql.match(/GROUP BY\s+([\w.]+)(?:\s+HAVING\s+(.*?))?(?:\s+ORDER BY|$)/i)
    const groupBy = groupByMatch ? groupByMatch[1] : ''
    const havingClause = groupByMatch ? groupByMatch[2] || '' : ''
    const havingParams: unknown[] = []

    const orderMatch = sql.match(/ORDER BY\s+(.*?)$/i)
    const orderBy = orderMatch ? orderMatch[1] : ''

    let paramIdx = 0
    const countPlaceholders = (s: string) => (s.match(/\?/g) || []).length

    paramIdx += countPlaceholders(selectFields)

    const wherePlaceholderCount = countPlaceholders(whereClause)
    if (wherePlaceholderCount > 0) {
      const mergedParams = this._mergeParams()
      for (let i = paramIdx; i < paramIdx + wherePlaceholderCount && i < mergedParams.length; i++) {
        whereParams.push(mergedParams[i])
      }
      paramIdx += wherePlaceholderCount
    }

    const havingPlaceholderCount = countPlaceholders(havingClause)
    if (havingPlaceholderCount > 0) {
      const mergedParams = this._mergeParams()
      for (let i = paramIdx; i < paramIdx + havingPlaceholderCount && i < mergedParams.length; i++) {
        havingParams.push(mergedParams[i])
      }
    }

    return { tableName, joins, whereClause, whereParams, selectFields, orderBy, groupBy, havingClause, havingParams }
  }

  private _mergeParams(): unknown[] {
    return this._currentParams || []
  }

  private _currentParams: unknown[] = []

  private _selectWithJoins(tableName: string, joins: { table: string; alias: string; leftCol: string; rightCol: string }[], params: unknown[]): Row[] {
    const mainRows = [...this.db.getTable(tableName)]
    this._currentParams = params

    let result = mainRows

    for (const join of joins) {
      const joinTable = this.db.getTable(join.table)
      const newResult: Row[] = []

      const leftParts = join.leftCol.split('.')
      const rightParts = join.rightCol.split('.')

      for (const row of result) {
        for (const joinRow of joinTable) {
          const leftVal = leftParts.length > 1 ? row[leftParts[1]] : row[leftParts[0]]
          const rightVal = rightParts.length > 1 ? joinRow[rightParts[1]] : joinRow[rightParts[0]]

          if (leftVal === rightVal) {
            const merged = { ...row }
            for (const [k, v] of Object.entries(joinRow)) {
              if (!(k in merged)) {
                merged[k] = v
              } else if (merged[k] !== v) {
                merged[`${join.alias}_${k}`] = v
              }
            }
            newResult.push(merged)
          }
        }
      }

      result = newResult
    }

    const whereMatch = this.sql.match(/WHERE\s+(.*?)(?:\s+ORDER BY|\s+GROUP BY|\s+HAVING|$)/i)
    if (whereMatch) {
      result = this._applyWhere(result, whereMatch[1], params)
    }

    const orderMatch = this.sql.match(/ORDER BY\s+(.*?)$/i)
    if (orderMatch) {
      result = this._applyOrderBy(result, orderMatch[1])
    }

    return result
  }

  private _applyWhere(rows: Row[], clause: string, params: unknown[]): Row[] {
    const conditions = clause.split(/\s+AND\s+/i).filter(c => !c.match(/^\d+=\d+$/))
    let paramIdx = 0

    return rows.filter(row => {
      for (const cond of conditions) {
        const eqMatch = cond.match(/([\w.]+)\s*=\s*\?/)
        const gteMatch = cond.match(/([\w.]+)\s*>=\s*\?/)
        const lteMatch = cond.match(/([\w.]+)\s*<=\s*\?/)
        const neqMatch = cond.match(/([\w.]+)\s*!=\s*\?/)
        const inMatch = cond.match(/([\w.]+)\s+IN\s+\(([^)]+)\)/i)
        const likeMatch = cond.match(/([\w.]+)\s+LIKE\s+\?/i)

        if (eqMatch) {
          const col = this._resolveColumn(eqMatch[1], row)
          if (col !== params[paramIdx++]) return false
        } else if (gteMatch) {
          const col = this._resolveColumn(gteMatch[1], row)
          if (Number(col) < Number(params[paramIdx++])) return false
        } else if (lteMatch) {
          const col = this._resolveColumn(lteMatch[1], row)
          if (Number(col) > Number(params[paramIdx++])) return false
        } else if (neqMatch) {
          const col = this._resolveColumn(neqMatch[1], row)
          if (col === params[paramIdx++]) return false
        } else if (inMatch) {
          const col = this._resolveColumn(inMatch[1], row)
          const placeholders = inMatch[2].split(',').filter(s => s.trim() === '?').length
          const values = params.slice(paramIdx, paramIdx + placeholders)
          paramIdx += placeholders
          if (!values.includes(col)) return false
        } else if (likeMatch) {
          const col = String(this._resolveColumn(likeMatch[1], row))
          const pattern = String(params[paramIdx++])
          const regex = new RegExp(pattern.replace(/%/g, '.*').replace(/_/g, '.'))
          if (!regex.test(col)) return false
        }
      }
      return true
    })
  }

  private _resolveColumn(colName: string, row: Row): unknown {
    const parts = colName.split('.')
    if (parts.length > 1) {
      const alias = parts[0]
      const field = parts[1]
      return row[field] ?? row[`${alias}_${field}`]
    }
    return row[colName]
  }

  private _applyGroupBy(rows: Row[], groupBy: string, havingClause: string, havingParams: unknown[]): Row[] {
    const groups = new Map<string, Row[]>()
    const groupCol = groupBy.replace(/\w+\./, '')

    for (const row of rows) {
      const key = String(row[groupCol] ?? '')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(row)
    }

    const result: Row[] = []
    for (const [key, groupRows] of groups) {
      const aggregated: Row = { [groupCol]: groupRows[0][groupCol] }

      if (havingClause) {
        const avgMatch = havingClause.match(/AVG\(([\w.]+)\)\s*(>=|<=|=|>|<)\s*\?/i)
        const countMatch = havingClause.match(/COUNT\(([\w.*]+)\)\s*(>=|<=|=|>|<)\s*\?/i)

        if (avgMatch) {
          const field = avgMatch[1].replace(/\w+\./, '')
          const op = avgMatch[2]
          const vals = groupRows.map(r => Number(r[field] || 0))
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length
          aggregated['avg_rating'] = avg
        }

        if (countMatch) {
          aggregated['count'] = groupRows.length
        }
      }

      aggregated['count'] = groupRows.length
      result.push(aggregated)
    }

    return result
  }

  private _applySelectFields(rows: Row[], fields: string): Row[] {
    const fieldList = fields.split(',').map(f => f.trim())
    return rows.map(row => {
      const result: Row = {}
      for (const f of fieldList) {
        const aliasMatch = f.match(/(.+?)\s+[Aa][Ss]\s+(\w+)/)
        if (aliasMatch) {
          const expr = aliasMatch[1].trim()
          const alias = aliasMatch[2]
          const avgMatch = expr.match(/AVG\(([\w.]+)\)/i)
          const countMatch = expr.match(/COUNT\(([\w.*]+)\)/i)

          if (avgMatch) {
            const col = avgMatch[1].replace(/\w+\./, '').replace('*', '')
            const vals = [row].map(r => Number(r[col] || 0))
            result[alias] = vals.reduce((a, b) => a + b, 0) / vals.length
          } else if (countMatch) {
            result[alias] = 1
          } else {
            const col = expr.replace(/\w+\./, '')
            result[alias] = row[col] ?? row[expr]
          }
        } else {
          const col = f.replace(/\w+\./, '')
          result[col] = row[col]
        }
      }
      return result
    })
  }

  private _applyOrderBy(rows: Row[], orderBy: string): Row[] {
    const parts = orderBy.trim().split(/\s+/)
    const col = parts[0].replace(/\w+\./, '')
    const dir = parts[1]?.toUpperCase() === 'DESC' ? -1 : 1

    return [...rows].sort((a, b) => {
      const av = String(a[col] ?? '')
      const bv = String(b[col] ?? '')
      return av.localeCompare(bv) * dir
    })
  }

  private _insert(params: unknown[]): { changes: number; lastInsertRowid: number } {
    const tableName = this._extractTableName(this.sql)
    const table = this.db.getTable(tableName)

    const colMatch = this.sql.match(/\(([^)]+)\)\s*VALUES/i)
    if (!colMatch) return { changes: 0, lastInsertRowid: 0 }

    const cols = colMatch[1].split(',').map(c => c.trim())
    const row: Row = {}

    for (let i = 0; i < cols.length; i++) {
      if (i < params.length) {
        row[cols[i]] = params[i]
      }
    }

    if (!row['id']) row['id'] = uuidv4()
    if (!row['created_at']) row['created_at'] = new Date().toISOString()

    table.push(row)
    return { changes: 1, lastInsertRowid: table.length }
  }

  private _update(params: unknown[]): { changes: number; lastInsertRowid: number } {
    const tableName = this._extractTableName(this.sql)
    const table = this.db.getTable(tableName)

    const setMatch = this.sql.match(/SET\s+(.*?)(?:\s+WHERE\s+|$)/i)
    if (!setMatch) return { changes: 0, lastInsertRowid: 0 }

    const setClauses = setMatch[1].split(',').map(s => s.trim())
    const whereMatch = this.sql.match(/WHERE\s+(.*?)$/i)

    let changes = 0
    let paramIdx = 0

    for (const row of table) {
      if (whereMatch) {
        if (!this._matchesWhere(row, whereMatch[1], params, setClauses.length)) continue
      }

      for (const clause of setClauses) {
        const eqMatch = clause.match(/(\w+)\s*=\s*\?/)
        if (eqMatch) {
          row[eqMatch[1]] = params[paramIdx++]
        }
      }

      if (whereMatch) {
        paramIdx = setClauses.length
        const whereParamStart = setClauses.length
        const remainingParams = params.slice(whereParamStart)
        this._applyWhereUpdate(row, whereMatch[1], remainingParams)
      }

      changes++
    }

    return { changes, lastInsertRowid: 0 }
  }

  private _matchesWhere(row: Row, whereClause: string, params: unknown[], setClauseCount: number): boolean {
    const conditions = whereClause.split(/\s+AND\s+/i)
    let paramIdx = setClauseCount

    for (const cond of conditions) {
      const eqMatch = cond.match(/([\w.]+)\s*=\s*\?/)
      if (eqMatch) {
        const col = eqMatch[1].replace(/\w+\./, '')
        if (row[col] !== params[paramIdx++]) return false
      }
    }

    return true
  }

  private _applyWhereUpdate(_row: Row, _whereClause: string, _params: unknown[]): void {}

  private _delete(params: unknown[]): { changes: number; lastInsertRowid: number } {
    const tableName = this._extractTableName(this.sql)
    const table = this.db.getTable(tableName)

    const whereMatch = this.sql.match(/WHERE\s+(.*?)$/i)
    if (!whereMatch) {
      const count = table.length
      table.length = 0
      return { changes: count, lastInsertRowid: 0 }
    }

    const before = table.length
    const conditions = whereMatch[1].split(/\s+AND\s+/i)
    let paramIdx = 0

    const toRemove = table.filter(row => {
      for (const cond of conditions) {
        const eqMatch = cond.match(/([\w.]+)\s*=\s*\?/)
        const gteMatch = cond.match(/([\w.]+)\s*>=\s*\?/)
        const ltMatch = cond.match(/([\w.]+)\s*<\s*\?/)

        if (eqMatch) {
          const col = eqMatch[1].replace(/\w+\./, '')
          if (row[col] !== params[paramIdx++]) return false
        } else if (gteMatch) {
          const col = gteMatch[1].replace(/\w+\./, '')
          if (String(row[col]) < String(params[paramIdx++])) return false
        } else if (ltMatch) {
          const col = ltMatch[1].replace(/\w+\./, '')
          if (String(row[col]) >= String(params[paramIdx++])) return false
        }
      }
      return true
    })

    for (const row of toRemove) {
      const idx = table.indexOf(row)
      if (idx !== -1) table.splice(idx, 1)
    }

    return { changes: before - table.length, lastInsertRowid: 0 }
  }

  private _extractTableName(sql: string): string {
    const match = sql.match(/(?:INSERT INTO|UPDATE|DELETE FROM)\s+(\w+)/i)
    return match ? match[1] : ''
  }
}

const db = new InMemoryDB()

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      city TEXT NOT NULL,
      address TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      amenities TEXT DEFAULT '[]',
      rules TEXT DEFAULT '[]',
      max_guests INTEGER DEFAULT 1,
      bedrooms INTEGER DEFAULT 1,
      bathrooms INTEGER DEFAULT 1,
      base_price INTEGER NOT NULL,
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS calendar_days (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      date TEXT NOT NULL,
      available INTEGER DEFAULT 1,
      price INTEGER NOT NULL,
      is_holiday INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      guest_id TEXT NOT NULL,
      host_id TEXT NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      guests INTEGER DEFAULT 1,
      total_price INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      confirmation_code TEXT DEFAULT '',
      door_password TEXT DEFAULT '',
      check_in_instructions TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_listing_id TEXT,
      to_guest_id TEXT,
      rating INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      type TEXT NOT NULL,
      created_at TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS room_status (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT DEFAULT '',
      reported_at TEXT DEFAULT ''
    );
  `)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function seedDb(): void {
  const userCount = db.prepare('SELECT id FROM users').all()
  if (userCount.length > 0) return

  const saltRounds = 10

  const host1Id = uuidv4()
  const host2Id = uuidv4()
  const guest1Id = uuidv4()
  const guest2Id = uuidv4()
  const guest3Id = uuidv4()

  const users = [
    { id: host1Id, email: 'host1@example.com', password: bcrypt.hashSync('123456', saltRounds), name: '张伟', role: 'host', avatar: '' },
    { id: host2Id, email: 'host2@example.com', password: bcrypt.hashSync('123456', saltRounds), name: '李娜', role: 'host', avatar: '' },
    { id: guest1Id, email: 'guest1@example.com', password: bcrypt.hashSync('123456', saltRounds), name: '王磊', role: 'guest', avatar: '' },
    { id: guest2Id, email: 'guest2@example.com', password: bcrypt.hashSync('123456', saltRounds), name: '刘洋', role: 'guest', avatar: '' },
    { id: guest3Id, email: 'guest3@example.com', password: bcrypt.hashSync('123456', saltRounds), name: '陈静', role: 'guest', avatar: '' },
  ]

  for (const u of users) {
    db.prepare(
      'INSERT INTO users (id, email, password, name, role, avatar) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(u.id, u.email, u.password, u.name, u.role, u.avatar)
  }

  const listingsData = [
    {
      id: uuidv4(), host_id: host1Id, title: '北京故宫旁精致四合院',
      description: '位于北京市中心，步行可达故宫和天安门广场，传统四合院改造，体验老北京生活。',
      city: '北京', address: '东城区南锣鼓巷胡同12号',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20courtyard%20house%20siheyuan%20Beijing%20warm%20lighting&image_size=landscape_16_9',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cozy%20Chinese%20courtyard%20interior%20traditional%20decoration&image_size=landscape_16_9'
      ]),
      amenities: JSON.stringify(['WiFi', '空调', '洗衣机', '厨房', '停车位']),
      rules: JSON.stringify(['禁止吸烟', '禁止宠物', '保持安静22:00后']),
      max_guests: 4, bedrooms: 2, bathrooms: 1, base_price: 688,
    },
    {
      id: uuidv4(), host_id: host1Id, title: '上海外滩江景公寓',
      description: '坐拥黄浦江一线江景，可远眺陆家嘴天际线，现代简约装修风格。',
      city: '上海', address: '黄浦区中山东一路88号',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20Shanghai%20bund%20river%20view%20apartment%20luxury&image_size=landscape_16_9',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20apartment%20interior%20Shanghai%20skyline%20view&image_size=landscape_16_9'
      ]),
      amenities: JSON.stringify(['WiFi', '空调', '洗衣机', '厨房', '健身房', '江景阳台']),
      rules: JSON.stringify(['禁止吸烟', '禁止派对']),
      max_guests: 2, bedrooms: 1, bathrooms: 1, base_price: 528,
    },
    {
      id: uuidv4(), host_id: host2Id, title: '杭州西湖边茶舍民宿',
      description: '紧邻西湖景区，推窗见湖，出门即景区，可体验采茶和茶道。',
      city: '杭州', address: '西湖区龙井路56号',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Hangzhou%20West%20Lake%20tea%20house%20traditional%20Chinese%20inn&image_size=landscape_16_9',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=peaceful%20tea%20room%20Chinese%20style%20lake%20view&image_size=landscape_16_9'
      ]),
      amenities: JSON.stringify(['WiFi', '空调', '茶室', '花园', '厨房']),
      rules: JSON.stringify(['禁止吸烟', '保持卫生']),
      max_guests: 3, bedrooms: 2, bathrooms: 1, base_price: 458,
    },
    {
      id: uuidv4(), host_id: host2Id, title: '成都宽窄巷子旁川西民居',
      description: '位于宽窄巷子景区旁，川西民居风格，可体验成都慢生活。',
      city: '成都', address: '青羊区宽窄巷子旁同仁路22号',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chengdu%20traditional%20Sichuan%20courtyard%20house%20cozy&image_size=landscape_16_9',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Sichuan%20style%20living%20room%20bamboo%20decoration&image_size=landscape_16_9'
      ]),
      amenities: JSON.stringify(['WiFi', '空调', '厨房', '花园', '麻将桌']),
      rules: JSON.stringify(['禁止吸烟', '可带宠物']),
      max_guests: 5, bedrooms: 3, bathrooms: 2, base_price: 388,
    },
    {
      id: uuidv4(), host_id: host1Id, title: '三亚海棠湾海景别墅',
      description: '面朝大海的海景别墅，私人泳池，步行可达沙滩，适合家庭度假。',
      city: '三亚', address: '海棠湾海岸大道168号',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Sanya%20tropical%20beach%20villa%20private%20pool%20ocean%20view&image_size=landscape_16_9',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=luxury%20villa%20interior%20tropical%20Swimming%20pool&image_size=landscape_16_9'
      ]),
      amenities: JSON.stringify(['WiFi', '空调', '私人泳池', '厨房', '停车位', '海景露台']),
      rules: JSON.stringify(['禁止吸烟', '禁止派对', '注意泳池安全']),
      max_guests: 6, bedrooms: 3, bathrooms: 2, base_price: 1288,
    },
    {
      id: uuidv4(), host_id: host2Id, title: '西安大雁塔旁唐风客栈',
      description: '紧邻大雁塔景区，唐代风格装修，感受古都文化魅力。',
      city: '西安', address: '雁塔区大雁塔南广场旁36号',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Xian%20Tang%20dynasty%20style%20inn%20traditional%20Chinese%20architecture&image_size=landscape_16_9',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20Tang%20dynasty%20room%20interior%20elegant%20red%20gold&image_size=landscape_16_9'
      ]),
      amenities: JSON.stringify(['WiFi', '空调', '厨房', '书房', '茶室']),
      rules: JSON.stringify(['禁止吸烟', '保持安静']),
      max_guests: 3, bedrooms: 2, bathrooms: 1, base_price: 368,
    },
  ]

  const listingIds: string[] = []
  for (const l of listingsData) {
    db.prepare(
      'INSERT INTO listings (id, host_id, title, description, city, address, images, amenities, rules, max_guests, bedrooms, bathrooms, base_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(l.id, l.host_id, l.title, l.description, l.city, l.address, l.images, l.amenities, l.rules, l.max_guests, l.bedrooms, l.bathrooms, l.base_price)
    listingIds.push(l.id)
  }

  const today = new Date()
  const holidayRanges = [
    { start: 0, end: 7 },
    { start: 30, end: 36 },
    { start: 60, end: 66 },
  ]

  for (let i = 0; i < listingIds.length; i++) {
    const lid = listingIds[i]
    const listing = listingsData[i]
    for (let j = 0; j < 90; j++) {
      const d = new Date(today)
      d.setDate(d.getDate() + j)
      const dateStr = formatDate(d)
      const isHoliday = holidayRanges.some(r => j >= r.start && j <= r.end)
      const price = isHoliday ? Math.round(listing.base_price * 1.3) : listing.base_price
      const available = j < 5 ? 0 : 1
      db.prepare(
        'INSERT INTO calendar_days (id, listing_id, date, available, price, is_holiday) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(uuidv4(), lid, dateStr, available, price, isHoliday ? 1 : 0)
    }
  }

  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2)
  const in3 = new Date(today); in3.setDate(in3.getDate() + 3)
  const in5 = new Date(today); in5.setDate(in5.getDate() + 5)
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7)
  const in10 = new Date(today); in10.setDate(in10.getDate() + 10)
  const in14 = new Date(today); in14.setDate(in14.getDate() + 14)

  const bookingsData = [
    {
      id: uuidv4(), listing_id: listingIds[0], guest_id: guest1Id, host_id: host1Id,
      check_in: formatDate(tomorrow), check_out: formatDate(in5),
      guests: 2, total_price: 688 * 4, status: 'paid',
      confirmation_code: '839201', door_password: '6688',
      check_in_instructions: '到达后在前台报确认码取钥匙，门锁密码为6688',
    },
    {
      id: uuidv4(), listing_id: listingIds[2], guest_id: guest2Id, host_id: host2Id,
      check_in: formatDate(in7), check_out: formatDate(in10),
      guests: 1, total_price: 458 * 3, status: 'confirmed',
      confirmation_code: '', door_password: '',
      check_in_instructions: '',
    },
    {
      id: uuidv4(), listing_id: listingIds[4], guest_id: guest3Id, host_id: host1Id,
      check_in: formatDate(dayAfter), check_out: formatDate(in7),
      guests: 4, total_price: 1288 * 5, status: 'pending',
      confirmation_code: '', door_password: '',
      check_in_instructions: '',
    },
    {
      id: uuidv4(), listing_id: listingIds[1], guest_id: guest1Id, host_id: host1Id,
      check_in: formatDate(in10), check_out: formatDate(in14),
      guests: 2, total_price: 528 * 4, status: 'pending',
      confirmation_code: '', door_password: '',
      check_in_instructions: '',
    },
    {
      id: uuidv4(), listing_id: listingIds[3], guest_id: guest2Id, host_id: host2Id,
      check_in: formatDate(in3), check_out: formatDate(in5),
      guests: 3, total_price: 388 * 2, status: 'checked_in',
      confirmation_code: '562783', door_password: '9966',
      check_in_instructions: '密码锁在门口，输入9966即可开门',
    },
  ]

  for (const b of bookingsData) {
    db.prepare(
      'INSERT INTO bookings (id, listing_id, guest_id, host_id, check_in, check_out, guests, total_price, status, confirmation_code, door_password, check_in_instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(b.id, b.listing_id, b.guest_id, b.host_id, b.check_in, b.check_out, b.guests, b.total_price, b.status, b.confirmation_code, b.door_password, b.check_in_instructions)
  }

  const reviewsData = [
    {
      id: uuidv4(), booking_id: bookingsData[0].id, from_user_id: guest1Id,
      to_listing_id: listingIds[0], to_guest_id: null,
      rating: 5, comment: '非常棒的四合院体验！位置绝佳，房间干净整洁，房东很热情。',
      type: 'guest_to_listing',
    },
    {
      id: uuidv4(), booking_id: bookingsData[0].id, from_user_id: host1Id,
      to_listing_id: null, to_guest_id: guest1Id,
      rating: 5, comment: '王磊先生非常有礼貌，爱护房间设施，欢迎下次再来！',
      type: 'host_to_guest',
    },
    {
      id: uuidv4(), booking_id: bookingsData[4].id, from_user_id: guest2Id,
      to_listing_id: listingIds[3], to_guest_id: null,
      rating: 4, comment: '位置很好，靠近宽窄巷子，民宿很有特色。就是隔音一般。',
      type: 'guest_to_listing',
    },
    {
      id: uuidv4(), booking_id: bookingsData[4].id, from_user_id: host2Id,
      to_listing_id: null, to_guest_id: guest2Id,
      rating: 4, comment: '客人很好沟通，遵守民宿规则。',
      type: 'host_to_guest',
    },
  ]

  for (const r of reviewsData) {
    db.prepare(
      'INSERT INTO reviews (id, booking_id, from_user_id, to_listing_id, to_guest_id, rating, comment, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(r.id, r.booking_id, r.from_user_id, r.to_listing_id, r.to_guest_id, r.rating, r.comment, r.type)
  }

  db.prepare('UPDATE listings SET rating = ?, review_count = ? WHERE id = ?').run(5, 1, listingIds[0])
  db.prepare('UPDATE listings SET rating = ?, review_count = ? WHERE id = ?').run(4, 1, listingIds[3])

  const notificationsData = [
    { id: uuidv4(), user_id: host1Id, type: 'booking', title: '新预订通知', message: '王磊预订了您的"北京故宫旁精致四合院"，请及时确认。' },
    { id: uuidv4(), user_id: guest1Id, type: 'payment', title: '支付成功', message: '您已成功支付"北京故宫旁精致四合院"的预订费用。' },
    { id: uuidv4(), user_id: host2Id, type: 'booking', title: '新预订通知', message: '刘洋预订了您的"杭州西湖边茶舍民宿"，请及时确认。' },
    { id: uuidv4(), user_id: guest2Id, type: 'check_in', title: '入住提醒', message: '您预订的"成都宽窄巷子旁川西民居"即将入住，请做好准备。' },
    { id: uuidv4(), user_id: host1Id, type: 'review', title: '收到新评价', message: '王磊对"北京故宫旁精致四合院"给出了5星好评！' },
  ]

  for (const n of notificationsData) {
    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
    ).run(n.id, n.user_id, n.type, n.title, n.message)
  }

  console.log('Database seeded successfully')
}

export default db
