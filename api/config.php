<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'keclyxbd_bonsicola');
define('DB_USER', 'keclyxbd_admin');
define('DB_PASS', 'Leminh@123456');

define('ADMIN_EMAIL', 'leminhdz@gmail.com');
define('ADMIN_PASS', 'admin123');

date_default_timezone_set('Asia/Ho_Chi_Minh');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

function db() {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        return $pdo;
    } catch (PDOException $e) {
        out(['error' => 'DB: ' . $e->getMessage(), 'code' => $e->getCode(), 'hint' => 'Mở /api/auto-setup.php'], 500);
    }
}
function out($data, $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    header('Content-Type: text/html; charset=utf-8');
    try {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS);
        $has = $pdo->query("SHOW TABLES LIKE 'users'")->rowCount() > 0;
        echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test DB</title><style>body{font-family:sans-serif;background:#0f172a;color:#fff;padding:20px}.box{max-width:600px;margin:0 auto;background:#1e293b;border-radius:16px;padding:24px}.ok{background:#064e3b;border-left:5px solid #10b981;padding:16px;border-radius:8px;margin:12px 0}.warn{background:#78350f;border-left:5px solid #f59e0b;padding:16px;border-radius:8px;margin:12px 0}.err{background:#450a0a;border-left:5px solid #ef4444;padding:16px;border-radius:8px}h1{font-size:20px}code{background:#0f172a;padding:3px 8px;border-radius:5px;color:#f59e0b}.btn{display:inline-block;padding:10px 20px;background:#3b5bfd;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;margin-top:12px}</style></head><body><div class="box">';
        if ($has) {
            echo '<h1 style="color:#22c55e">✅ KẾT NỐI DATABASE THÀNH CÔNG!</h1>';
            echo '<div class="ok"><b>DB:</b> <code>' . DB_NAME . '</code><br><b>User:</b> <code>' . DB_USER . '</code><br><b>Bảng users:</b> ✅ Có</div>';
            echo '<div style="text-align:center"><a href="/" class="btn">🏠 VỀ TRANG CHỦ</a></div>';
        } else {
            echo '<h1 style="color:#f59e0b">⚠️ CẦN IMPORT SQL</h1>';
            echo '<div class="warn"><b>Chưa có bảng users!</b><br>Mở <a href="auto-setup.php" style="color:#60a5fa">/api/auto-setup.php</a> để tạo tự động</div>';
        }
        echo '</div></body></html>';
        exit;
    } catch (PDOException $e) {
        echo '<h1 style="color:#ef4444">❌ LỖI DATABASE</h1>';
        echo '<div class="err">' . htmlspecialchars($e->getMessage()) . '</div>';
        echo '<p>Code: ' . $e->getCode() . '</p>';
        echo '<p><b>Config:</b></p><ul><li>DB_NAME: <code>' . DB_NAME . '</code></li><li>DB_USER: <code>' . DB_USER . '</code></li><li>DB_PASS: <code>' . substr(DB_PASS,0,3) . '***' . substr(DB_PASS,-3) . '</code></li></ul>';
        echo '</div></body></html>';
        exit;
    }
}
?>
