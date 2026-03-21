// 全局配置
const API_BASE_URL = '/api';
let currentUser = null;
let cachedPosts = [];
const HOME_COMMENT_PREVIEW_COUNT = 2;
const HOME_CONTENT_PREVIEW_LENGTH = 220;

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
    // 默认显示首页，不需要登录也可以浏览
    goToHome();
}

function updateUIAfterAuth() {
    document.getElementById('auth-menu-btn').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'inline-block';
    // 只有ID为1的用户（作者）才能看到发布文章的链接
    if (currentUser && currentUser.id === 1) {
        document.getElementById('create-link').style.display = 'inline-block';
    } else {
        document.getElementById('create-link').style.display = 'none';
    }
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
    // 改为允许未登录用户查看博客列表
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
    document.getElementById('detail-page').style.display = 'none';
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
async function loadPosts(focusPostId = null) {
    const container = document.getElementById('posts-container');
    const loading = document.getElementById('loading');

    loading.classList.add('active');
    container.innerHTML = '';

    try {
        const response = await fetch('/posts');
        const posts = await response.json();
        cachedPosts = Array.isArray(posts) ? posts : [];

        loading.classList.remove('active');

        if (!cachedPosts || cachedPosts.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">还没有文章，去发布一篇吧！</p>';
            return;
        }

        if (focusPostId) {
            goToPostDetail(focusPostId, cachedPosts);
            return;
        }

        cachedPosts.forEach(post => {
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
    const postId = getEntityId(post);
    card.onclick = () => goToPostDetail(postId);

    const createdAt = formatDate(post);
    const previewHtml = buildMarkdownPreview(post.content, HOME_CONTENT_PREVIEW_LENGTH);
    const allComments = Array.isArray(post.comments) ? post.comments : [];
    const previewComments = allComments.slice(0, HOME_COMMENT_PREVIEW_COUNT);
    const hiddenCommentCount = Math.max(allComments.length - previewComments.length, 0);

    // 创建评论HTML
    let commentsHtml = `
        <div class="comments-section">
            <h4>评论预览 (${previewComments.length}/${allComments.length})</h4>
            <div class="comments-list">
    `;
    
    if (previewComments.length > 0) {
        previewComments.forEach(comment => {
            const commentDate = formatDate(comment);
            commentsHtml += `
                <div class="comment-item">
                    <div class="comment-meta">
                        <strong>${escapeHtml(comment.author?.username || '匿名')}</strong>
                        <span class="comment-date">📅 ${commentDate}</span>
                    </div>
                    <div class="comment-content">${renderMarkdown(comment.content)}</div>
                </div>
            `;
        });
    } else {
        commentsHtml += '<p style="text-align: center; color: #999;">还没有评论</p>';
    }

    if (hiddenCommentCount > 0) {
        commentsHtml += `<p class="more-comments-tip">还有 ${hiddenCommentCount} 条评论，点击查看全文后可见</p>`;
    }
    
    commentsHtml += `</div>`;

    commentsHtml += `</div>`;

    card.innerHTML = `
        <h3>${escapeHtml(post.title)}</h3>
        <div class="post-meta">📅 ${createdAt} | 👤 ${escapeHtml(post.author?.username || '匿名')}</div>
        <div class="post-content">${previewHtml}</div>
        ${commentsHtml}
        <div class="post-actions">
            <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); goToPostDetail(${postId});">查看全文</button>
        </div>
    `;

    return card;
}

function goToPostDetail(postId, postsData = null) {
    const source = Array.isArray(postsData) ? postsData : cachedPosts;
    const normalizedId = Number(postId);
    const post = source.find(item => Number(getEntityId(item)) === normalizedId);

    if (!post) {
        alert('文章不存在或已被删除');
        return;
    }

    hideAllPages();
    document.getElementById('detail-page').style.display = 'block';
    renderPostDetail(post);
}

function renderPostDetail(post) {
    const detailContainer = document.getElementById('post-detail-container');
    if (!detailContainer) return;

    const createdAt = formatDate(post);
    const allComments = Array.isArray(post.comments) ? post.comments : [];
    const postId = getEntityId(post);

    let commentsHtml = `
        <div class="comments-section">
            <h4>全部评论 (${allComments.length})</h4>
            <div class="comments-list">
    `;

    if (allComments.length > 0) {
        allComments.forEach(comment => {
            const commentDate = formatDate(comment);
            commentsHtml += `
                <div class="comment-item">
                    <div class="comment-meta">
                        <strong>${escapeHtml(comment.author?.username || '匿名')}</strong>
                        <span class="comment-date">📅 ${commentDate}</span>
                    </div>
                    <div class="comment-content">${renderMarkdown(comment.content)}</div>
                </div>
            `;
        });
    } else {
        commentsHtml += '<p style="text-align: center; color: #999;">还没有评论</p>';
    }

    commentsHtml += '</div>';

    if (currentUser) {
        commentsHtml += `
            <div class="comment-form">
                <textarea id="comment-${postId}" class="comment-input" placeholder="发表评论..." rows="3"></textarea>
                <button class="btn btn-primary btn-small" onclick="submitComment(${postId})">发表评论</button>
            </div>
        `;
    } else {
        commentsHtml += '<p style="text-align: center; color: #999;">登录后可发表评论</p>';
    }

    commentsHtml += '</div>';

    detailContainer.innerHTML = `
        <article class="post-detail-card">
            <h2>${escapeHtml(post.title)}</h2>
            <div class="post-meta">📅 ${createdAt} | 👤 ${escapeHtml(post.author?.username || '匿名')}</div>
            <div class="post-content-full">${renderMarkdown(post.content)}</div>
            ${commentsHtml}
        </article>
    `;
}

function getEntityId(entity) {
    if (!entity || typeof entity !== 'object') return 0;
    const id = entity.id ?? entity.ID;
    return Number(id || 0);
}

function formatDate(entity) {
    const raw = entity?.created_at ?? entity?.CreatedAt;
    if (!raw) return '未知日期';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '未知日期';
    return date.toLocaleDateString('zh-CN');
}

function buildMarkdownPreview(content, maxLength) {
    const source = (content || '').trim();
    if (!source) return '<p>暂无内容</p>';

    const lines = source.split(/\r?\n/);
    let currentLength = 0;
    const pickedLines = [];

    for (const line of lines) {
        const nextLength = currentLength + line.length + 1;
        if (nextLength > maxLength) break;
        pickedLines.push(line);
        currentLength = nextLength;
    }

    if (pickedLines.length === 0) {
        pickedLines.push(source.slice(0, maxLength));
    }

    const clipped = pickedLines.join('\n').trim();
    const hasMore = clipped.length < source.length;
    const previewSource = hasMore ? `${clipped}\n\n...` : clipped;
    return renderMarkdown(previewSource);
}

function renderMarkdown(text) {
    const source = (text || '').trim();
    if (!source) return '';

    try {
        let rawHtml = '';

        // 优先使用 marked；若 CDN 不可用则自动回退到本地基础渲染。
        if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
            marked.setOptions({
                gfm: true,
                breaks: true
            });
            const parsed = marked.parse(source);
            rawHtml = typeof parsed === 'string' ? parsed : basicMarkdownToHtml(source);
        } else {
            rawHtml = basicMarkdownToHtml(source);
        }

        if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
            return DOMPurify.sanitize(rawHtml);
        }

        // 没有 DOMPurify 时使用安全的基础渲染，避免返回未过滤 HTML。
        return basicMarkdownToHtml(source);
    } catch (error) {
        return basicMarkdownToHtml(source);
    }
}

function basicMarkdownToHtml(text) {
    const safeText = escapeHtml(text || '');
    if (!safeText.trim()) return '';

    const lines = safeText.split(/\r?\n/);
    const html = [];
    const listStack = [];
    let inCodeBlock = false;
    let codeBlockBuffer = [];

    const closeLists = () => {
        while (listStack.length > 0) {
            html.push(`</${listStack.pop()}>`);
        }
    };

    for (const line of lines) {
        const fenceMatch = line.match(/^```/);
        if (fenceMatch) {
            if (!inCodeBlock) {
                closeLists();
                inCodeBlock = true;
                codeBlockBuffer = [];
            } else {
                html.push(`<pre><code>${codeBlockBuffer.join('\n')}</code></pre>`);
                inCodeBlock = false;
                codeBlockBuffer = [];
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockBuffer.push(line);
            continue;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            closeLists();
            const level = headingMatch[1].length;
            html.push(`<h${level}>${applyInlineMarkdown(headingMatch[2])}</h${level}>`);
            continue;
        }

        const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
        if (orderedMatch) {
            if (listStack[listStack.length - 1] !== 'ol') {
                closeLists();
                listStack.push('ol');
                html.push('<ol>');
            }
            html.push(`<li>${applyInlineMarkdown(orderedMatch[1])}</li>`);
            continue;
        }

        const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
        if (unorderedMatch) {
            if (listStack[listStack.length - 1] !== 'ul') {
                closeLists();
                listStack.push('ul');
                html.push('<ul>');
            }
            html.push(`<li>${applyInlineMarkdown(unorderedMatch[1])}</li>`);
            continue;
        }

        if (!line.trim()) {
            closeLists();
            continue;
        }

        closeLists();
        html.push(`<p>${applyInlineMarkdown(line)}</p>`);
    }

    if (inCodeBlock) {
        html.push(`<pre><code>${codeBlockBuffer.join('\n')}</code></pre>`);
    }
    closeLists();

    return html.join('');
}

function applyInlineMarkdown(text) {
    return (text || '')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

// HTML转义，防止XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 提交评论
async function submitComment(postId) {
    const textarea = document.getElementById(`comment-${postId}`);
    const content = textarea.value.trim();

    if (!content) {
        alert('评论不能为空');
        return;
    }

    if (!currentUser) {
        alert('请先登录');
        return;
    }

    try {
        const response = await fetch('/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                user_id: currentUser.id,
                post_id: postId
            })
        });

        if (response.ok) {
            textarea.value = '';
            alert('评论发表成功！');
            // 重新加载数据；如果当前在详情页，则保持在详情页查看最新评论。
            if (document.getElementById('detail-page').style.display === 'block') {
                loadPosts(postId);
            } else {
                loadPosts();
            }
        } else {
            const data = await response.json();
            alert(data.error || '评论发表失败');
        }
    } catch (error) {
        alert('网络错误：' + error.message);
    }
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
