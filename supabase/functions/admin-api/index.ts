// ============================================================
// Supabase Edge Function: admin-api
// 处理所有管理操作
// ============================================================
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS 预检
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, password, ...params } = await req.json();

    // 验证密码
    const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
    if (!ADMIN_PASSWORD) {
      return json({ error: "服务器未配置密码" }, 500);
    }
    if (password !== ADMIN_PASSWORD) {
      return json({ error: "密码错误" }, 401);
    }

    // 创建 Supabase 客户端（使用 service_role 绕过 RLS）
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 路由
    switch (action) {
      case "verify":
        return json({ valid: true });

      case "list":
        return await handleList(supabase, params);

      case "get":
        return await handleGet(supabase, params);

      case "updateStatus":
        return await handleUpdateStatus(supabase, params);

      case "reply":
        return await handleReply(supabase, params);

      case "export":
        return await handleExport(supabase);

      default:
        return json({ error: `未知操作: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err.message || "服务器内部错误" }, 500);
  }
});

// ============================================================
// 列表查询（带分页、筛选、搜索）
// ============================================================
async function handleList(supabase, params) {
  const page = Math.max(1, parseInt(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize) || 15));
  const { search, category, status } = params;

  let query = supabase
    .from("suggestions")
    .select("*", { count: "exact" });

  if (search) {
    query = query.ilike("content", `%${search}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  // 获取统计
  const { data: all } = await supabase.from("suggestions").select("status");
  const stats = {
    total: all?.length || 0,
    pending: all?.filter((s) => s.status === "pending").length || 0,
    read: all?.filter((s) => s.status === "read").length || 0,
    replied: all?.filter((s) => s.status === "replied").length || 0,
    archived: all?.filter((s) => s.status === "archived").length || 0,
  };

  return json({ data, total: count, stats });
}

// ============================================================
// 获取单条意见详情（含回复）
// ============================================================
async function handleGet(supabase, params) {
  const { id } = params;
  if (!id) return json({ error: "缺少 id" }, 400);

  const { data: suggestion, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  const { data: replies } = await supabase
    .from("replies")
    .select("*")
    .eq("suggestion_id", id)
    .order("created_at", { ascending: true });

  return json({ data: { ...suggestion, replies: replies || [] } });
}

// ============================================================
// 更新意见状态
// ============================================================
async function handleUpdateStatus(supabase, params) {
  const { id, status } = params;
  if (!id || !status) return json({ error: "缺少参数" }, 400);

  const validStatuses = ["pending", "read", "replied", "archived"];
  if (!validStatuses.includes(status)) {
    return json({ error: `无效状态: ${status}` }, 400);
  }

  const { error } = await supabase
    .from("suggestions")
    .update({ status })
    .eq("id", id);

  if (error) throw error;

  return json({ success: true });
}

// ============================================================
// 添加回复
// ============================================================
async function handleReply(supabase, params) {
  const { id, content } = params;
  if (!id || !content) return json({ error: "缺少参数" }, 400);

  // 插入回复
  const { error: replyError } = await supabase
    .from("replies")
    .insert({ suggestion_id: id, content });

  if (replyError) throw replyError;

  // 自动更新状态为「已回复」
  await supabase
    .from("suggestions")
    .update({ status: "replied" })
    .eq("id", id);

  // 尝试发送邮件通知
  try {
    const { data: suggestion } = await supabase
      .from("suggestions")
      .select("author_email, content, is_anonymous")
      .eq("id", id)
      .single();

    if (suggestion?.author_email && !suggestion.is_anonymous) {
      const res = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            to: suggestion.author_email,
            subject: "你的意见已收到回复",
            text: `你的意见：\n\n${suggestion.content.slice(0, 100)}...\n\n已收到回复：\n\n${content}\n\n感谢你的反馈！`,
          }),
        }
      );
      console.log("Email notification sent:", res.status);
    }
  } catch (emailErr) {
    console.error("Email notification failed:", emailErr.message);
  }

  return json({ success: true });
}

// ============================================================
// 导出 CSV
// ============================================================
async function handleExport(supabase) {
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const header = "ID,状态,分类,内容,提交者,邮箱,是否匿名,创建时间,更新时间";
  const rows = (data || []).map((s) => {
    const escape = (str) => {
      if (!str) return "";
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };
    return [
      s.id,
      s.status,
      s.category,
      escape(s.content),
      escape(s.author_name || ""),
      escape(s.author_email || ""),
      s.is_anonymous ? "是" : "否",
      s.created_at,
      s.updated_at,
    ].join(",");
  });

  return json({ csv: [header, ...rows].join("\n") });
}

// ============================================================
// 辅助
// ============================================================
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}