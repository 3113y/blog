(function () {
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function encodePathPart(value) {
    return encodeURIComponent(String(value || "").trim());
  }

  function normalizeMarkdownText(text) {
    return String(text || "")
      .replace(/\r\n?/g, "\n")
      .replace(/\\n/g, "\n");
  }

  function renderInlineMarkdown(text) {
    var escaped = escapeHtml(text);
    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return escaped;
  }

  function basicMarkdownToHtml(markdownText) {
    var source = normalizeMarkdownText(markdownText);
    var codeBlocks = [];
    source = source.replace(/```([\s\S]*?)```/g, function (_, code) {
      var token = "__CODE_BLOCK_" + codeBlocks.length + "__";
      codeBlocks.push("<pre><code>" + escapeHtml(code.trim()) + "</code></pre>");
      return token;
    });

    var lines = source.split("\n");
    var html = [];
    var inUl = false;
    var inOl = false;

    function closeLists() {
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
    }

    lines.forEach(function (line) {
      if (/^\s*$/.test(line)) {
        closeLists();
        return;
      }

      var match;

      match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        closeLists();
        var level = match[1].length;
        html.push("<h" + level + ">" + renderInlineMarkdown(match[2]) + "</h" + level + ">");
        return;
      }

      match = line.match(/^>\s?(.*)$/);
      if (match) {
        closeLists();
        html.push("<blockquote>" + renderInlineMarkdown(match[1]) + "</blockquote>");
        return;
      }

      match = line.match(/^[-*+]\s+(.*)$/);
      if (match) {
        if (!inUl) {
          closeLists();
          inUl = true;
          html.push("<ul>");
        }
        html.push("<li>" + renderInlineMarkdown(match[1]) + "</li>");
        return;
      }

      match = line.match(/^\d+\.\s+(.*)$/);
      if (match) {
        if (!inOl) {
          closeLists();
          inOl = true;
          html.push("<ol>");
        }
        html.push("<li>" + renderInlineMarkdown(match[1]) + "</li>");
        return;
      }

      closeLists();
      html.push("<p>" + renderInlineMarkdown(line) + "</p>");
    });

    closeLists();

    var output = html.join("\n");
    codeBlocks.forEach(function (block, index) {
      output = output.replace("__CODE_BLOCK_" + index + "__", block);
    });

    return output;
  }

  function renderMarkdown(markdownText) {
    var normalized = normalizeMarkdownText(markdownText);

    if (window.marked && typeof window.marked.parse === "function") {
      var rawHtml = window.marked.parse(normalized, {
        gfm: true,
        breaks: true
      });
      if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
        return window.DOMPurify.sanitize(rawHtml);
      }
      return rawHtml;
    }

    return basicMarkdownToHtml(normalized);
  }

  function getId(item) {
    return item && (item.id ?? item.ID);
  }

  function getDate(item) {
    return item && (item.created_at || item.CreatedAt || item.updated_at || item.UpdatedAt || "");
  }

  function formatDate(raw) {
    if (!raw) return "";
    var date = new Date(raw);
    if (isNaN(date.getTime())) return String(raw);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getAuthorName(post) {
    return (post && post.author && post.author.username) || "匿名";
  }

  function normalizeArray(values, lower) {
    if (!Array.isArray(values)) return [];
    var seen = new Set();
    var result = [];
    values.forEach(function (value) {
      var str = String(value || "").trim();
      if (!str) return;
      if (lower) str = str.toLowerCase();
      if (seen.has(str)) return;
      seen.add(str);
      result.push(str);
    });
    return result;
  }

  function getCategories(post) {
    var explicit = normalizeArray(post && post.categories, false);
    if (explicit.length) return explicit;
    return [getAuthorName(post)];
  }

  function getTags(post) {
    var explicit = normalizeArray(post && post.tags, true);
    if (explicit.length) return explicit;
    return extractTags(post);
  }

  function extractTags(post) {
    var source = ((post && post.title) || "") + " " + ((post && post.content) || "");
    var regexp = /(^|\s)#([\w-]{1,32})/g;
    var result = [];
    var found;
    while ((found = regexp.exec(source)) !== null) {
      result.push(found[2].toLowerCase());
    }
    return Array.from(new Set(result));
  }

  function getArchiveKey(post) {
    var date = new Date(getDate(post));
    if (isNaN(date.getTime())) return "未分组";
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  function buildBuckets(posts, getKeys) {
    var map = new Map();
    posts.forEach(function (post) {
      var keys = getKeys(post) || [];
      keys.forEach(function (key) {
        if (!key) return;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push(post);
      });
    });
    return map;
  }

  async function fetchPosts() {
    var resp = await fetch("/api/posts");
    if (!resp.ok) {
      throw new Error("请求失败: " + resp.status);
    }

    var data = await resp.json();
    if (!Array.isArray(data)) return [];

    return data.sort(function (a, b) {
      var da = new Date(getDate(a)).getTime() || 0;
      var db = new Date(getDate(b)).getTime() || 0;
      return db - da;
    });
  }

  function renderHome(posts) {
    var list = document.getElementById("post-list");
    var loading = document.getElementById("loading-tip");
    if (!list) return;

    if (loading) loading.textContent = "";

    if (!posts.length) {
      list.innerHTML = "<p class=\"text-muted\">还没有文章，先发布第一篇吧。</p>";
      return;
    }

    list.innerHTML = posts.map(function (post) {
      var id = getId(post);
      var title = escapeHtml(post.title || "无标题");
      var author = escapeHtml((post.author && post.author.username) || "匿名");
      var date = formatDate(getDate(post));
      var categories = getCategories(post).map(escapeHtml).join(" / ");
      var tags = getTags(post).map(function (tag) { return "#" + escapeHtml(tag); }).join(" ");
      var content = renderMarkdown(post.content || "");
      var comments = Array.isArray(post.comments) ? post.comments.length : 0;

      return "" +
        "<article class=\"card-wrapper card\">" +
        "  <a href=\"/posts/" + encodeURIComponent(id) + "\" class=\"post-preview row g-0 flex-md-row-reverse\">" +
        "    <div class=\"col-md-12\">" +
        "      <div class=\"card-body d-flex flex-column\">" +
        "        <h1 class=\"card-title my-2 mt-md-0\">" + title + "</h1>" +
        "        <div class=\"post-preview-text markdown-body\">" + content + "</div>" +
        "        <div class=\"post-meta flex-grow-1 d-flex align-items-end\">" +
        "          <div class=\"me-auto\">" +
        "            <i class=\"far fa-calendar fa-fw me-1\"></i>" + date +
        "            <i class=\"far fa-user fa-fw ms-3 me-1\"></i>" + author +
        "            <i class=\"far fa-folder fa-fw ms-3 me-1\"></i>" + categories +
        "            <i class=\"far fa-comments fa-fw ms-3 me-1\"></i>" + comments + " 评论" +
        (tags ? ("<div class=\"mt-2\">" + tags + "</div>") : "") +
        "          </div>" +
        "        </div>" +
        "      </div>" +
        "    </div>" +
        "  </a>" +
        "</article>";
    }).join("\n");
  }

  function renderBucketLinks(map, type) {
    var listEl = document.getElementById("bucket-list");
    if (!listEl) return;

    var entries = Array.from(map.entries()).sort(function (a, b) {
      if (type === "archives") return String(b[0]).localeCompare(String(a[0]));
      return String(a[0]).localeCompare(String(b[0]));
    });

    if (!entries.length) {
      listEl.innerHTML = "<p class=\"text-muted\">暂无可展示的数据。</p>";
      return;
    }

    listEl.innerHTML = entries.map(function (entry) {
      var key = entry[0];
      var count = entry[1].length;
      var href;
      if (type === "categories") {
        href = "/categories/" + encodePathPart(key);
      } else if (type === "tags") {
        href = "/tags/" + encodePathPart(key);
      } else {
        href = "/archives/#" + encodePathPart(key);
      }

      return "<div class=\"list-item\"><a href=\"" + href + "\">" + escapeHtml(key) +
        "</a> <span class=\"text-muted\">(" + count + " 篇)</span></div>";
    }).join("\n");
  }

  function renderArchives(map) {
    var listEl = document.getElementById("bucket-list");
    if (!listEl) return;

    var entries = Array.from(map.entries()).sort(function (a, b) {
      return String(b[0]).localeCompare(String(a[0]));
    });

    if (!entries.length) {
      listEl.innerHTML = "<p class=\"text-muted\">暂无可展示的数据。</p>";
      return;
    }

    listEl.innerHTML = entries.map(function (entry) {
      var key = entry[0];
      var posts = entry[1];
      var id = encodePathPart(key);
      var items = posts.map(function (post) {
        return "<li><a href=\"/posts/" + encodeURIComponent(getId(post)) + "\">" +
          escapeHtml(post.title || "无标题") + "</a></li>";
      }).join("\n");

      return "<section id=\"" + id + "\" class=\"mb-4\">" +
        "<h3>" + escapeHtml(key) + " <span class=\"text-muted\">(" + posts.length + " 篇)</span></h3>" +
        "<ul>" + items + "</ul>" +
        "</section>";
    }).join("\n");
  }

  function parseTermInfo() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    var type = parts[0];
    if (type !== "categories" && type !== "tags") return null;
    var name = decodeURIComponent(parts[1] || "");
    return { type: type, name: name };
  }

  function renderTerm(posts) {
    var info = parseTermInfo();
    if (!info) {
      showError("无效的筛选地址。");
      return;
    }

    var titleEl = document.getElementById("term-title");
    var crumbEl = document.getElementById("term-crumb");
    var listEl = document.getElementById("term-list");
    if (!titleEl || !crumbEl || !listEl) return;

    var selected;
    if (info.type === "categories") {
      selected = posts.filter(function (post) {
        return getCategories(post).includes(info.name);
      });
      titleEl.textContent = "分类：" + info.name;
      crumbEl.textContent = "分类";
    } else {
      selected = posts.filter(function (post) {
        return getTags(post).includes(info.name.toLowerCase());
      });
      titleEl.textContent = "标签：#" + info.name;
      crumbEl.textContent = "标签";
    }

    if (!selected.length) {
      listEl.innerHTML = "<p class=\"text-muted\">该筛选下暂无文章。</p>";
      return;
    }

    listEl.innerHTML = selected.map(function (post) {
      return "<div class=\"list-item\"><a href=\"/posts/" + encodeURIComponent(getId(post)) + "\">" +
        escapeHtml(post.title || "无标题") + "</a> <span class=\"text-muted\">" +
        escapeHtml(formatDate(getDate(post))) + "</span></div>";
    }).join("\n");
  }

  function renderPost(post) {
    var titleEl = document.getElementById("post-title");
    var metaEl = document.getElementById("post-meta");
    var contentEl = document.getElementById("post-content");
    var commentsEl = document.getElementById("comments");

    if (!titleEl || !metaEl || !contentEl || !commentsEl) return;

    titleEl.textContent = post.title || "无标题";

    var author = escapeHtml((post.author && post.author.username) || "匿名");
    var date = formatDate(getDate(post));
    var categories = getCategories(post).map(escapeHtml).join(" / ");
    var tags = getTags(post).map(function (tag) { return "#" + escapeHtml(tag); }).join(" ");

    metaEl.innerHTML = "<span><i class=\"far fa-calendar fa-fw me-1\"></i>" + escapeHtml(date) + "</span>" +
      "<span class=\"ms-3\"><i class=\"far fa-user fa-fw me-1\"></i>" + author + "</span>" +
      "<span class=\"ms-3\"><i class=\"far fa-folder fa-fw me-1\"></i>" + categories + "</span>" +
      (tags ? ("<div class=\"mt-2\"><i class=\"fa fa-tags fa-fw me-1\"></i>" + tags + "</div>") : "");

    contentEl.innerHTML = renderMarkdown(post.content || "");

    var comments = Array.isArray(post.comments) ? post.comments : [];
    if (!comments.length) {
      commentsEl.innerHTML = "<p class=\"text-muted\">暂无评论</p>";
      return;
    }

    commentsEl.innerHTML = comments.map(function (comment) {
      var name = escapeHtml((comment.author && comment.author.username) || "匿名");
      var dateText = escapeHtml(formatDate(getDate(comment)));
      var content = renderMarkdown(comment.content || "");
      return "" +
        "<div class=\"comment-item\">" +
        "  <div class=\"text-muted\"><i class=\"far fa-user fa-fw me-1\"></i>" + name +
        "  <span class=\"ms-2\"><i class=\"far fa-calendar fa-fw me-1\"></i>" + dateText + "</span></div>" +
        "  <div class=\"comment-content markdown-body\">" + content + "</div>" +
        "</div>";
    }).join("\n");
  }

  function getPostIdFromPath() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length < 2 || parts[0] !== "posts") return null;
    var id = Number(parts[1]);
    return Number.isFinite(id) ? id : null;
  }

  function showError(message) {
    var el = document.getElementById("error-tip");
    if (el) el.textContent = message;
  }

  async function boot() {
    var page = document.body.getAttribute("data-page");

    try {
      var posts = await fetchPosts();

      if (page === "home") {
        renderHome(posts);
        return;
      }

      if (page === "post") {
        var id = getPostIdFromPath();
        if (id == null) {
          showError("无效的文章地址。");
          return;
        }

        var post = posts.find(function (item) {
          return Number(getId(item)) === id;
        });

        if (!post) {
          showError("文章不存在或已删除。");
          return;
        }

        renderPost(post);
        return;
      }

      if (page === "categories") {
        renderBucketLinks(buildBuckets(posts, function (post) {
          return getCategories(post);
        }), "categories");
        return;
      }

      if (page === "tags") {
        renderBucketLinks(buildBuckets(posts, getTags), "tags");
        return;
      }

      if (page === "archives") {
        renderArchives(buildBuckets(posts, function (post) {
          return [getArchiveKey(post)];
        }));
        return;
      }

      if (page === "term") {
        renderTerm(posts);
      }
    } catch (err) {
      showError("加载失败：" + (err && err.message ? err.message : "未知错误"));
      var loading = document.getElementById("loading-tip");
      if (loading) loading.textContent = "";
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
