// 全局配置
const API_BASE_URL = '/api';
let currentUser = null;

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    loadUserFromStorage();
    checkAuthStatus();
});

// 本地存储相关
function saveUserToStorage(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    currentUser = user;
    updateUIAfterAuth();
}

function loadUserFromStorage() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        updateUIAfterAuth();
    }
}

function clearUserFromStorage() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    updateUIBeforeAuth();
}

// 认证状态管理
function checkAuthStatus() {
    if (currentUser) {
        goToHome();
    } else {
        showAuthPage();
    }
}

function updateUIAfterAuth() {
    document.getElementById('auth-menu-btn').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'inline-block';
    document.getElementById('create-link').style.display = 'inline-block';
}

function updateUIBeforeAuth() {
    document.getElementById('auth-menu-btn').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('create-link').style.display = 'none';
    document.getElementById('auth-dropdown').style.display = 'none';
}

// 切换认证菜单
function toggleAuthMenu() {
    const dropdown = document.getElementById('auth-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// 显示/隐藏登录和注册表单
function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('auth-dropdown').style.display = 'none';
}

function showRegister() {
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('auth-dropdown').style.display = 'none';
}

function showAuthPage() {
    hideAllPages();
    document.getElementById('auth-page').style.display = 'block';
    showRegister(); // 默认显示注册表单
}

// 页面导航
function goToHome() {
    if (!currentUser) {
        showAuthPage();
        return;
    }
    hideAllPages();
    document.getElementById('home-page').style.display = 'block';
    loadPosts();
}

function goToCreate() {
    if (!currentUser) {
        showAuthPage();
        return;
    }
    hideAllPages();
    document.getElementById('create-page').style.display = 'block';
}

function hideAllPages() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('create-page').style.display = 'none';
}

// 注册处理
async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        const messageEl = document.getElementById('register-message');

        if (response.ok) {
            messageEl.className = 'message success';
            messageEl.textContent = '注册成功！请登录';
            setTimeout(() => showLogin(), 1500);
        } else {
            messageEl.className = 'message error';
            messageEl.textContent = data.error || '注册失败';
        }
    } catch (error) {
        document.getElementById('register-message').className = 'message error';
        document.getElementById('register-message').textContent = '网络错误：' + error.message;
    }
}

// 登录处理
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        const messageEl = document.getElementById('login-message');

        if (response.ok) {
            saveUserToStorage(data);
            messageEl.className = 'message success';
            messageEl.textContent = '登录成功！';
            setTimeout(() => goToHome(), 1000);
        } else {
            messageEl.className = 'message error';
            messageEl.textContent = data.error || '登录失败';
        }
    } catch (error) {
        document.getElementById('login-message').className = 'message error';
        document.getElementById('login-message').textContent = '网络错误：' + error.message;
    }
}

// 登出
function logout() {
    clearUserFromStorage();
    showAuthPage();
}

// 加载文章列表
async function loadPosts() {
    const container = document.getElementById('posts-container');
    const loading = document.getElementById('loading');

    loading.classList.add('active');
    container.innerHTML = '';

    try {
        const response = await fetch('/posts');
        const posts = await response.json();

        loading.classList.remove('active');

        if (!posts || posts.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">还没有文章，去发布一篇吧！</p>';
            return;
        }

        posts.forEach(post => {
            const card = createPostCard(post);
            container.appendChild(card);
        });
    } catch (error) {
        loading.classList.remove('active');
        container.innerHTML = '<p style="color: red; text-align: center;">加载文章失败: ' + error.message + '</p>';
    }
}

// 创建文章卡片
function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';

    const createdAt = new Date(post.created_at).toLocaleDateString('zh-CN');

    card.innerHTML = `
        <h3>${escapeHtml(post.title)}</h3>
        <div class="post-meta">📅 ${createdAt} | 👤 ${escapeHtml(post.author?.username || '匿名')}</div>
        <div class="post-content">${escapeHtml(post.content)}</div>
    `;

    return card;
}

// HTML转义，防止XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 创建文章处理
async function handleCreatePost(event) {
    event.preventDefault();

    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;

    if (!currentUser) {
        alert('请先登录');
        return;
    }

    try {
        const response = await fetch('/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                content,
                user_id: currentUser.id
            })
        });

        const messageEl = document.getElementById('create-message');

        if (response.ok) {
            messageEl.className = 'message success';
            messageEl.textContent = '文章发布成功！';
            document.getElementById('post-title').value = '';
            document.getElementById('post-content').value = '';
            setTimeout(() => goToHome(), 1500);
        } else {
            const data = await response.json();
            messageEl.className = 'message error';
            messageEl.textContent = data.error || '发布失败';
        }
    } catch (error) {
        document.getElementById('create-message').className = 'message error';
        document.getElementById('create-message').textContent = '网络错误：' + error.message;
    }
}

// 关闭下拉菜单（点击其他地方时）
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('auth-dropdown');
    const authBtn = document.getElementById('auth-menu-btn');
    if (!dropdown.contains(e.target) && !authBtn.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});
