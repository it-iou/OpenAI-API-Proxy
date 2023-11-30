let queriedApiKeys = [];
let serialNumber = 1;

async function checkBilling(apiKey, apiUrl) {
  const now = new Date();
  let startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const subDate = new Date(now);
  subDate.setDate(1);

  const headers = {
    "Authorization": "Bearer " + apiKey,
    "Content-Type": "application/json"
  };
  const modelsCheck = `${apiUrl}/v1/models`;
  const urlSubscription = `${apiUrl}/v1/dashboard/billing/subscription`;
  let urlUsage = `${apiUrl}/v1/dashboard/billing/usage?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`;
  const urlsetid = apiUrl + '/v1/organizations';

  try {
    let totalAmount, totalUsage, remaining, GPT35CheckResult, GPT4CheckResult, GPT432kCheckResult, setid, isSubscrible;
    let SubscribleInformation = {};
    let SubInformation;
    let errors = {};

    let response = await fetch(urlSubscription, { headers });

    let currentDate = new Date();
    const subscriptionData = await response.json();
    const expiryDate = new Date(subscriptionData.access_until * 1000 + 8 * 60 * 60 * 1000);
    const formattedDate = `${expiryDate.getFullYear()}-${(expiryDate.getMonth() + 1).toString().padStart(2, '0')}-${expiryDate.getDate().toString().padStart(2, '0')}`;

    try {
      totalAmount = subscriptionData.system_hard_limit_usd;

      if (totalAmount > 20) {
        startDate = subDate;
        urlUsage = `${apiUrl}/v1/dashboard/billing/usage?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`;
        response = await fetch(urlUsage, { headers });
        const usageData = await response.json();
      }
      response = await fetch(urlUsage, { headers });
      const usageData = await response.json();
      totalUsage = usageData.total_usage / 100;
      remaining = currentDate > expiryDate ? "❌过期" : (totalAmount - totalUsage).toFixed(3);
    } catch (error) {
      console.error(error);
      errors['subscription'] = error.message;
    }

    //获取是否绑卡
    try {
      isSubscrible = subscriptionData.plan.id.includes('payg') ? '✅' : '❌';
    } catch (error) {
      console.error(error);
    }

    //获取绑卡信息
    try {
      SubscribleInformation.account_name = subscriptionData.account_name;
      SubscribleInformation.po_number = subscriptionData.po_number;
      SubscribleInformation.billing_email = subscriptionData.billing_email;
      SubscribleInformation.tax_ids = subscriptionData.tax_ids;

      let billingAddress = subscriptionData.billing_address;
      let businessAddress = subscriptionData.business_address;

      SubInformation = "Account Name: " + SubscribleInformation.account_name + "---";
      SubInformation += "PO Number: " + SubscribleInformation.po_number + "---";
      SubInformation += "Billing Email: " + SubscribleInformation.billing_email + "---";
      SubInformation += "Tax IDs: " + SubscribleInformation.tax_ids + "---";
      SubInformation += "Billing Address: " + (billingAddress?.line1 ? billingAddress.line1 : '') + ", " + (billingAddress?.city ? billingAddress.city : '') + ", " + (billingAddress?.state ? billingAddress.state : '') + ", " + (billingAddress?.country ? billingAddress.country : '') + ", " + (billingAddress?.postal_code ? billingAddress.postal_code : '') + "---";
      SubInformation += "Business Address: " + (businessAddress?.line1 ? businessAddress.line1 : '') + ", " + (businessAddress?.city ? businessAddress.city : '') + ", " + (businessAddress?.state ? businessAddress.state : '') + ", " + (businessAddress?.country ? businessAddress.country : '') + ", " + (businessAddress?.postal_code ? businessAddress.postal_code : '');
    } catch (error) {
      console.error(error);
    }

    //组织信息
    try {
      response = await fetch(urlsetid, { headers });
      const setiddata = await response.json();
      setid = '';
      const emailStartIndex = setiddata.data[0].description.lastIndexOf(' ') + 1;
      const email = setiddata.data[0].description.substring(emailStartIndex);
      if (typeof setiddata.data[1] !== 'undefined') {
        setid = setiddata.data[0].title + '----' + email + '----' + setiddata.data[0].id + '----' + setiddata.data[1].id;
      } else {
        setid = setiddata.data[0].title + '----' + email + '----' + setiddata.data[0].id;
      }
    } catch (error) {
      console.error(error);
      errors['setid'] = error.message;
    }

    // 初始化模型查询结果
    GPT35CheckResult = '❌';
    GPT4CheckResult = '❌';
    GPT432kCheckResult = '❌';

    //3.5模型查询
    let GPT35CheckSuccess = false;
    try {
      const modelsCheckResponse = await fetch(modelsCheck, { headers });
      const modelsCheckData = await modelsCheckResponse.json();
      GPT35CheckSuccess = GPT35CheckResult = Array.isArray(modelsCheckData.data) && modelsCheckData.data.some(item => item.id.includes('gpt-3.5-turbo')) ? '✅' : '❌';
    } catch (error) {
      console.error(error);
      errors['modelsCheck'] = error.message;
    }

    //4模型查询
    try {
      const modelsCheckResponse = await fetch(modelsCheck, { headers });
      const modelsCheckData = await modelsCheckResponse.json();
      GPT4CheckResult = Array.isArray(modelsCheckData.data) && modelsCheckData.data.some(item => item.id.includes('gpt-4')) ? '✅' : '❌';
      GPT432kCheckResult = Array.isArray(modelsCheckData.data) && modelsCheckData.data.some(item => item.id.includes('gpt-4-32k')) ? '✅' : '❌';
    } catch (error) {
      console.error(error);
      errors['modelsCheck'] = error.message;
    }

    //返回值
    return [totalAmount, totalUsage, remaining, formattedDate, GPT35CheckResult, GPT4CheckResult, GPT432kCheckResult, isSubscrible, SubInformation, setid, errors, GPT35CheckSuccess];
  } catch (error) {
    return ["Error", null, null, null, null, null, null, null];
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

//查询函数
function sendRequest() {
  let button = document.querySelector("button");
  button.textContent = "加载中...";
  button.disabled = true;
  button.classList.add("loading")

  let apiKeyInput = document.getElementById("api-key-input");
  let apiUrlSelect = document.getElementById("api-url-select");
  let customUrlInput = document.getElementById("custom-url-input");
  let table = document.getElementById("result-table");
  let h2 = document.getElementById("result-head");
  h2.style.visibility = "hidden";
  table.style.visibility = "hidden";

  if (apiKeyInput.value.trim() === "") {
    alert("请填写API KEY");
    apiKeyInput.focus();
    button.textContent = "查询";
    button.disabled = false;
    button.classList.remove("loading");
    return;
  }

  document.getElementById("result-table").getElementsByTagName('tbody')[0].innerHTML = "";

  let apiUrl = "";
  if (apiUrlSelect.value === "custom") {
    if (customUrlInput.value.trim() === "") {
      alert("请设置API链接");
      customUrlInput.focus();
      button.textContent = "查询";
      button.disabled = false;
      button.classList.remove("loading");
      return;
    } else {
      apiUrl = customUrlInput.value.trim();
      if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
        apiUrl = "https://" + apiUrl;
      }
    }
  } else {
    apiUrl = apiUrlSelect.value;
  }

  let apiKeys = apiKeyInput.value.split(/[,\s，\n]+/);

  if (apiKeys.length === 0) {
    alert("未匹配到 API-KEY，请检查输入内容");
    apiKeyInput.focus();
    button.textContent = "查询";
    button.disabled = false;
    button.classList.remove("loading");
    return;
  }

  alert("成功匹配到 API Key，确认后开始查询：" + apiKeys);

  let tableBody = document.querySelector("#result-table tbody");
  for (let i = 0; i < apiKeys.length; i++) {
    let apiKey = apiKeys[i].trim();

    if (queriedApiKeys.includes(apiKey)) {

      alert(`API KEY ${apiKey} 已查询过，跳过此次查询`);
      console.log(`API KEY ${apiKey} 已查询过，跳过此次查询`);
      continue;
    }
    queriedApiKeys.push(apiKey);

    checkBilling(apiKey, apiUrl).then((data) => {
      data = data.map(item => {
        if (item === undefined) {
          return 'Not Found.'
        } else {
          return item
        }

      });
      let row = document.createElement("tr");

      let serialNumberCell = document.createElement("td");
      serialNumberCell.textContent = serialNumber;
      row.appendChild(serialNumberCell);

      let apiKeyCell = document.createElement("td");
      apiKeyCell.setAttribute('data-full-key', apiKey);
      apiKeyCell.setAttribute('data-masked-key', apiKey.replace(/^(.{5}).*(.{4})$/, "$1***$2"));
      apiKeyCell.textContent = apiKey.replace(/^(.{5}).*(.{4})$/, "$1***$2");
      row.appendChild(apiKeyCell);

      console.log('查看查询结果', data);

      if (data[0] === undefined) {
        let errorMessageCell = document.createElement("td");
        errorMessageCell.colSpan = "8";
        errorMessageCell.classList.add("status-error");
        errorMessageCell.textContent = "不正确或已失效的API-KEY";
        row.appendChild(errorMessageCell);
      } else {
        let totalAmount = document.createElement("td");
        totalAmount.textContent = data[0];
        row.appendChild(totalAmount);

        let totalUsedCell = document.createElement("td");
        if (!isNaN(data[1])) {
          totalUsedCell.textContent = data[1].toFixed(3);
        } else {
          totalUsedCell.textContent = '❌'
        }
        row.appendChild(totalUsedCell);

        let totalAvailableCell = document.createElement("td");
        totalAvailableCell.textContent = typeof data[2] === 'number' ? data[2] : data[2];
        row.appendChild(totalAvailableCell);

        let progressCell = document.createElement("td");
        let progressContainer = document.createElement("div");
        progressContainer.style.width = "100%";
        progressContainer.style.height = "20px";
        progressContainer.style.backgroundColor = "#f3f3f3";
        let progressBar = document.createElement("div");
        progressBar.style.width = (data[1] / data[0] * 100).toFixed(2) + "%";
        progressBar.style.height = "20px";
        progressBar.style.backgroundColor = "#4CAF50";
        progressBar.style.position = "relative";
        progressBar.textContent = (data[1] / data[0] * 100).toFixed(2) + "%";
        progressBar.style.textAlign = "right";
        progressBar.style.paddingRight = "5px";
        progressBar.style.color = "black";
        progressContainer.appendChild(progressBar);
        progressCell.appendChild(progressContainer);
        row.appendChild(progressCell);

        let expireTime = document.createElement("td");
        expireTime.textContent = data[3];
        row.appendChild(expireTime);

        let GPT35CheckResult = document.createElement("td");
        GPT35CheckResult.textContent = data[4];
        row.appendChild(GPT35CheckResult);

        let GPT4CheckResult = document.createElement("td");
        GPT4CheckResult.textContent = data[5];
        row.appendChild(GPT4CheckResult);

        let GPT432kCheckResult = document.createElement("td");
        GPT432kCheckResult.textContent = data[6];
        row.appendChild(GPT432kCheckResult);

        let isSubscribe = document.createElement("td");
        isSubscribe.textContent = data[7];
        row.appendChild(isSubscribe);

        let SubInformation = document.createElement("td");
        SubInformation.textContent = data[8];
        row.appendChild(SubInformation);

        let setidCell = document.createElement("td");
        setidCell.textContent = data[9];
        row.appendChild(setidCell);

        let isSubscriptionValid = document.createElement("td");
        isSubscriptionValid.textContent = data[4] === '✅' ? '🥰' : '🥶';
        isSubscriptionValid.classList.add('emoji');
        row.appendChild(isSubscriptionValid);
      }
      tableBody.appendChild(row);

      if (i === apiKeys.length - 1) {
        updateExportButtonsState();
        queriedApiKeys = [];
      }
      serialNumber++;
      h2.style.visibility = 'visible';
      table.style.visibility = 'visible';

      button.textContent = "查询";
      button.disabled = false;
      button.classList.remove("loading");
    });
  }
}

let apiUrlSelect = document.getElementById("api-url-select");
let customUrlInput = document.getElementById("custom-url-input");

apiUrlSelect.addEventListener("change", function () {
  if (apiUrlSelect.value === "custom") {
    customUrlInput.style.display = "inline-block";
    customUrlInput.style.marginTop = "5px";
  } else {
    customUrlInput.style.display = "none";
  }

  resetButtonState(); // 切换接口后重置查询按钮状态
});

function resetButtonState() {
  let button = document.querySelector("button");
  button.textContent = "查询";
  button.disabled = false;
  button.classList.remove("loading");
}


function exportToExcel() {
  let table = document.getElementById("result-table");
  let wb = XLSX.utils.table_to_book(table);
  let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  let blob = new Blob([wbout], { type: 'application/octet-stream' });
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'api_keys.xlsx';
  a.click();
}

function exportToTxt() {
  let table = document.getElementById("result-table");
  let tableBody = table.getElementsByTagName("tbody")[0];
  let rows = tableBody.getElementsByTagName("tr");
  let txtContent = "";

  for (let i = 0; i < rows.length; i++) {
    let cells = rows[i].getElementsByTagName("td");
    let cellContent = cells[1].textContent; // 获取第二列的内容（API KEY）
    txtContent += cellContent + "\n";
  }

  let blob = new Blob([txtContent], { type: "text/plain" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "api_keys.txt";
  a.click();
}

function updateExportButtonsState() {
  let tableBody = document.querySelector("#result-table tbody");
  let hasData = tableBody.getElementsByTagName("tr").length > 0;

  let exportButtons = document.querySelectorAll("button[onclick^='exportTo']");
  exportButtons.forEach(button => {
    button.disabled = !hasData;
  });
}

document.getElementById('toggle-api-key').addEventListener('change', function () {
  let apiKeyCells = document.querySelectorAll("#result-table td:nth-child(2)"); // 第二列为 API 密钥
  apiKeyCells.forEach(cell => {
    if (this.checked) {
      // 显示完整的 API 密钥
      cell.textContent = cell.getAttribute('data-full-key');
    } else {
      // 隐藏部分 API 密钥
      cell.textContent = cell.getAttribute('data-masked-key');
    }
  });
});
