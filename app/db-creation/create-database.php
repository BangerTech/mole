<?php
/**
 * Mole Database Creation Script
 * Provides functionality to create new databases of different types
 */

// Check for POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    // Get POST data
    $db_type = $_POST['db_type'] ?? '';
    $db_name = $_POST['db_name'] ?? '';
    $db_host = $_POST['db_host'] ?? '';
    $db_port = $_POST['db_port'] ?? '';
    $db_user = $_POST['db_user'] ?? '';
    $db_pass = $_POST['db_pass'] ?? '';
    
    // Validate inputs
    if (empty($db_type) || empty($db_name) || empty($db_host) || empty($db_user) || empty($db_pass)) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }
    
    // Set default ports if not provided
    if (empty($db_port)) {
        switch ($db_type) {
            case 'mysql':
                $db_port = 3306;
                break;
            case 'postgresql':
                $db_port = 5432;
                break;
            case 'influxdb':
                $db_port = 8086;
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid database type']);
                exit;
        }
    }
    
    // Create database based on type
    switch ($db_type) {
        case 'mysql':
            $result = createMySQLDatabase($db_host, $db_port, $db_user, $db_pass, $db_name);
            break;
        case 'postgresql':
            $result = createPostgreSQLDatabase($db_host, $db_port, $db_user, $db_pass, $db_name);
            break;
        case 'influxdb':
            $result = createInfluxDBDatabase($db_host, $db_port, $db_user, $db_pass, $db_name);
            break;
        default:
            $result = ['success' => false, 'message' => 'Unsupported database type'];
    }
    
    echo json_encode($result);
    exit;
}

/**
 * Create a MySQL database
 */
function createMySQLDatabase($host, $port, $user, $pass, $dbname) {
    try {
        // Connect to MySQL
        $dsn = "mysql:host=$host;port=$port";
        $pdo = new PDO($dsn, $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Create database
        $dbname = $pdo->quote($dbname);
        $stmt = $pdo->prepare("CREATE DATABASE IF NOT EXISTS $dbname");
        $stmt->execute();
        
        return ['success' => true, 'message' => "MySQL database '$dbname' created successfully"];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'MySQL Error: ' . $e->getMessage()];
    }
}

/**
 * Create a PostgreSQL database
 */
function createPostgreSQLDatabase($host, $port, $user, $pass, $dbname) {
    try {
        // Connect to PostgreSQL
        $dsn = "pgsql:host=$host;port=$port;dbname=postgres";
        $pdo = new PDO($dsn, $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Check if database exists
        $stmt = $pdo->prepare("SELECT 1 FROM pg_database WHERE datname = ?");
        $stmt->execute([$dbname]);
        
        if ($stmt->fetchColumn() === false) {
            // Create database
            $dbname_quoted = $pdo->quote($dbname);
            $stmt = $pdo->prepare("CREATE DATABASE $dbname_quoted");
            $stmt->execute();
            return ['success' => true, 'message' => "PostgreSQL database '$dbname' created successfully"];
        } else {
            return ['success' => true, 'message' => "PostgreSQL database '$dbname' already exists"];
        }
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'PostgreSQL Error: ' . $e->getMessage()];
    }
}

/**
 * Create an InfluxDB database
 */
function createInfluxDBDatabase($host, $port, $user, $pass, $dbname) {
    try {
        // For InfluxDB we use API calls
        $url = "http://$host:$port/query";
        
        // Create database query
        $data = [
            'q' => "CREATE DATABASE $dbname",
            'u' => $user,
            'p' => $pass
        ];
        
        // Use cURL to make the request
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($status === 200) {
            $result = json_decode($response, true);
            if (isset($result['error'])) {
                return ['success' => false, 'message' => 'InfluxDB Error: ' . $result['error']];
            }
            return ['success' => true, 'message' => "InfluxDB database '$dbname' created successfully"];
        } else {
            return ['success' => false, 'message' => "InfluxDB Error: HTTP Status $status"];
        }
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'InfluxDB Error: ' . $e->getMessage()];
    }
}

// If it's not a POST request, show error message
echo json_encode(['success' => false, 'message' => 'Invalid request method, use POST']); 