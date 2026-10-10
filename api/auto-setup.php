<?php
require_once __DIR__ . '/config.php';
header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Auto Setup</title><style>body{font-family:sans-serif;background:#0f172a;color:#fff;padding:20px}.box{max-width:640px;margin:0 auto;background:#1e293b;border-radius:16px;padding:24px}.ok{background:#064e3b;border-left:5px solid #10b981;padding:12px;border-radius:8px;margin:8px 0}.err{background:#450a0a;border-left:5px solid #ef4444;padding:12px;border-radius:8px}h1{color:#22c55e}code{background:#0f172a;padding:3px 8px;border-radius:5px;color:#f59e0b}.btn{display:inline-block;padding:12px 24px;background:#3b5bfd;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;margin-top:16px}.btn-green{background:#10b981}</style></head><body><div class="box">';
echo '<h1>🔧 AUTO SETUP DATABASE</h1>';
try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS);
    echo '<div class="ok">✅ Kết nối DB: <b>' . DB_NAME . '</b></div>';

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(150) UNIQUE NOT NULL,password VARCHAR(255) NOT NULL,name VARCHAR(100),balance BIGINT DEFAULT 0,key_expiry BIGINT DEFAULT 0,is_admin TINYINT DEFAULT 0,ip VARCHAR(50),last_login BIGINT DEFAULT 0,created_at BIGINT DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo '<div class="ok">✅ Bảng <b>users</b></div>';

    $pdo->exec("CREATE TABLE IF NOT EXISTS `keys` (id INT AUTO_INCREMENT PRIMARY KEY,code VARCHAR(50) UNIQUE NOT NULL,days INT DEFAULT 1,used TINYINT DEFAULT 0,used_by VARCHAR(150),created_at BIGINT DEFAULT 0,used_at BIGINT DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo '<div class="ok">✅ Bảng <b>keys</b></div>';

    $pdo->exec("CREATE TABLE IF NOT EXISTS deposits (id VARCHAR(50) PRIMARY KEY,email VARCHAR(150) NOT NULL,amount BIGINT DEFAULT 0,status VARCHAR(20) DEFAULT 'pending',note TEXT,ip VARCHAR(50),created_at BIGINT DEFAULT 0,approved_at BIGINT DEFAULT 0,rejected_at BIGINT DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo '<div class="ok">✅ Bảng <b>deposits</b></div>';

    $pdo->exec("CREATE TABLE IF NOT EXISTS history (id INT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(150) NOT NULL,type VARCHAR(30),amount BIGINT DEFAULT 0,balance BIGINT DEFAULT 0,note VARCHAR(255),at BIGINT DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo '<div class="ok">✅ Bảng <b>history</b></div>';

    $pdo->exec("CREATE TABLE IF NOT EXISTS config (k VARCHAR(100) PRIMARY KEY,v LONGTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo '<div class="ok">✅ Bảng <b>config</b></div>';

    $check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([ADMIN_EMAIL]);
    if (!$check->fetch()) {
        $pdo->prepare('INSERT INTO users (email,password,name,balance,key_expiry,is_admin,ip,last_login,created_at) VALUES (?,?,?,?,?,1,?,?,?)')
            ->execute([ADMIN_EMAIL, ADMIN_PASS, 'Admin BONSICOLA', 999999999, 9999999999999, 'local', time()*1000, time()*1000]);
        echo '<div class="ok">✅ Đã tạo admin: <code>' . ADMIN_EMAIL . '</code> / <code>' . ADMIN_PASS . '</code></div>';
    } else {
        echo '<div class="ok">✅ Admin đã tồn tại</div>';
    }

    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo '<div class="ok"><b>📊 Tổng: ' . count($tables) . ' bảng</b><br>';
    foreach ($tables as $t) echo '• <code>' . $t . '</code><br>';
    echo '</div>';

    echo '<h1 style="text-align:center">🎉 HOÀN THÀNH!</h1>';
    echo '<div style="text-align:center"><a href="/" class="btn btn-green">🏠 VỀ TRANG CHỦ</a> <a href="/api/index.php?action=ping" class="btn">🧪 TEST API</a></div>';
    echo '<p style="text-align:center;margin-top:16px;color:#94a3b8;font-size:12px">⚠️ Xoá file này sau khi dùng!</p>';
} catch (PDOException $e) {
    echo '<div class="err"><b>❌ LỖI:</b> ' . htmlspecialchars($e->getMessage()) . '<br>Code: ' . $e->getCode() . '</div>';
    echo '<p><b>Kiểm tra:</b></p><ul><li>DB_NAME: <code>' . DB_NAME . '</code></li><li>DB_USER: <code>' . DB_USER . '</code></li></ul>';
}
echo '</div></body></html>';
?>
