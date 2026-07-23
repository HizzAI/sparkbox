for f in ['admin.js', 'app.js']:
    with open(f, 'r') as file:
        content = file.read()
    content = content.replace('supabaseClient.co', 'supabase.co')
    content = content.replace('window.supabaseClient', 'window.supabase')
    with open(f, 'w') as file:
        file.write(content)
