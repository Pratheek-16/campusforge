import sqlite3
conn = sqlite3.connect('campusforge.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(opportunities)')
cols = [(r[1], r[2]) for r in cursor.fetchall()]
print('Opportunities cols:', cols)
cursor.execute("SELECT COUNT(*) FROM opportunities")
count = cursor.fetchone()[0]
print('Row count:', count)
conn.close()
