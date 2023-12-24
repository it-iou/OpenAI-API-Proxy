<?php

header('Content-Type: application/json');

// 检查是否有refresh_token参数
if (isset($_POST['refresh_token'])) {
    $refreshToken = urlencode($_POST['refresh_token']); // 对参数进行URL编码

    // 初始化cURL会话
    $curl = curl_init();

    // 设置cURL选项
    curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://auth.lqqq.ltd/platform/refresh?refresh_token=' . $refreshToken, // 修改为你的接口URL
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/x-www-form-urlencoded'
        ),
    ));

    // 执行cURL会话
    $response = curl_exec($curl);

    // 检查是否有错误
    if(curl_errno($curl)) {
        echo json_encode(['error' => 'Curl error: ' . curl_error($curl)]);
    } else {
        // 关闭cURL会话
        curl_close($curl);

        // 解析响应
        $responseData = json_decode($response, true);

        // 检查响应是否包含所需数据
        if (isset($responseData['login_info']['user']['session']['sensitive_id'], 
                  $responseData['token_info']['access_token'], 
                  $responseData['token_info']['refresh_token'])) {
            echo json_encode([
                'sensitive_id' => $responseData['login_info']['user']['session']['sensitive_id'],
                'access_token' => $responseData['token_info']['access_token'],
                'refresh_token' => $responseData['token_info']['refresh_token']
            ]);
        } else {
            echo json_encode(['error' => 'Required data not found in the response']);
        }
    }
} else {
    echo json_encode(['error' => 'No refresh token provided']);
}
?>
