import json
from pathlib import Path
from collections import OrderedDict


def normalize_pricing_value(value):
    if not value:
        return 'unknown'
    token = str(value).strip().lower()
    if 'free' in token:
        return 'free'
    if 'freemium' in token:
        return 'freemium'
    if 'enterprise' in token:
        return 'enterprise'
    if 'paid' in token or 'usage' in token or 'limited' in token or 'api' in token or 'open' in token:
        return 'paid' if 'free' not in token else 'free'
    return 'unknown'

DATA = [
    # Writing
    {
        'name': 'ChatGPT', 'category': 'Writing', 'description': 'AI assistant for writing, coding, research, and conversation.',
        'website': 'https://chatgpt.com', 'pricing': 'Freemium',
        'features': ['Content Writing', 'Code Generation', 'Research Assistance'],
        'tags': ['AI Assistant', 'Writing', 'Chatbot']
    },
    {
        'name': 'Claude', 'category': 'Writing', 'description': 'AI assistant focused on long-form writing, reasoning, and document analysis.',
        'website': 'https://claude.ai', 'pricing': 'Freemium',
        'features': ['Long-form Writing', 'Document Analysis', 'Reasoning'],
        'tags': ['AI Assistant', 'Writing', 'Research']
    },
    {
        'name': 'Jasper', 'category': 'Writing', 'description': 'AI content creation platform for marketing and business writing.',
        'website': 'https://www.jasper.ai', 'pricing': 'Paid',
        'features': ['Marketing Copy', 'Blog Writing', 'Brand Voice'],
        'tags': ['Writing', 'Marketing', 'Content Creation']
    },
    {
        'name': 'Copy.ai', 'category': 'Writing', 'description': 'AI-powered copywriting tool for sales and marketing content.',
        'website': 'https://www.copy.ai', 'pricing': 'Freemium',
        'features': ['Copywriting', 'Sales Content', 'Marketing Automation'],
        'tags': ['Copywriting', 'Marketing', 'AI Writer']
    },
    {
        'name': 'Writesonic', 'category': 'Writing', 'description': 'AI writing platform for blogs, ads, and SEO content.',
        'website': 'https://writesonic.com', 'pricing': 'Freemium',
        'features': ['Blog Writing', 'SEO Content', 'Ad Copy'],
        'tags': ['Writing', 'SEO', 'Marketing']
    },
    {
        'name': 'Rytr', 'category': 'Writing', 'description': 'Affordable AI writing assistant for content generation.',
        'website': 'https://rytr.me', 'pricing': 'Freemium',
        'features': ['Content Writing', 'Email Writing', 'Blog Generation'],
        'tags': ['Writing', 'Content', 'Productivity']
    },
    {
        'name': 'Sudowrite', 'category': 'Writing', 'description': 'AI writing assistant designed for fiction and creative writers.',
        'website': 'https://www.sudowrite.com', 'pricing': 'Paid',
        'features': ['Story Writing', 'Creative Writing', 'Novel Assistance'],
        'tags': ['Writing', 'Creative', 'Storytelling']
    },
    {
        'name': 'Grammarly', 'category': 'Writing', 'description': 'AI-powered grammar, spelling, and writing improvement assistant.',
        'website': 'https://www.grammarly.com', 'pricing': 'Freemium',
        'features': ['Grammar Check', 'Writing Enhancement', 'Tone Detection'],
        'tags': ['Writing', 'Grammar', 'Productivity']
    },
    {
        'name': 'QuillBot', 'category': 'Writing', 'description': 'AI paraphrasing and writing enhancement platform.',
        'website': 'https://quillbot.com', 'pricing': 'Freemium',
        'features': ['Paraphrasing', 'Summarization', 'Grammar Checking'],
        'tags': ['Writing', 'Paraphrasing', 'Education']
    },
    {
        'name': 'HyperWrite', 'category': 'Writing', 'description': 'AI writing assistant for content creation and productivity.',
        'website': 'https://www.hyperwriteai.com', 'pricing': 'Freemium',
        'features': ['Content Writing', 'Email Drafting', 'Research Assistance'],
        'tags': ['Writing', 'Productivity', 'AI Assistant']
    },
    # Image
    {
        'name': 'Midjourney', 'category': 'Image', 'description': 'AI image generation platform known for creating highly artistic and photorealistic images from text prompts.',
        'website': 'https://www.midjourney.com', 'pricing': 'Paid',
        'features': ['Text-to-Image', 'Photorealistic Art', 'Style Control'],
        'tags': ['Image Generation', 'Art', 'Creative AI']
    },
    {
        'name': 'DALL·E', 'category': 'Image', 'description': "OpenAI's image generation model that creates and edits images from natural language prompts.",
        'website': 'https://openai.com/dall-e', 'pricing': 'Freemium',
        'features': ['Text-to-Image', 'Image Editing', 'Inpainting'],
        'tags': ['Image Generation', 'OpenAI', 'Creative AI']
    },
    {
        'name': 'Adobe Firefly', 'category': 'Image', 'description': "Adobe's generative AI platform for image creation, editing, and design workflows.",
        'website': 'https://firefly.adobe.com', 'pricing': 'Freemium',
        'features': ['Generative Fill', 'Text Effects', 'Image Generation'],
        'tags': ['Image Generation', 'Design', 'Adobe']
    },
    {
        'name': 'Leonardo AI', 'category': 'Image', 'description': 'AI-powered image generation platform focused on creative artwork, gaming assets, and illustrations.',
        'website': 'https://leonardo.ai', 'pricing': 'Freemium',
        'features': ['AI Art', 'Asset Generation', 'Model Training'],
        'tags': ['Image Generation', 'Gaming', 'Art']
    },
    {
        'name': 'Ideogram', 'category': 'Image', 'description': 'AI image generator specializing in text rendering and high-quality visual design generation.',
        'website': 'https://ideogram.ai', 'pricing': 'Freemium',
        'features': ['Text-in-Image', 'Graphic Design', 'Image Generation'],
        'tags': ['Image Generation', 'Typography', 'Design']
    },
    {
        'name': 'Flux', 'category': 'Image', 'description': 'Advanced image generation model family developed by Black Forest Labs.',
        'website': 'https://blackforestlabs.ai', 'pricing': 'Freemium',
        'features': ['Text-to-Image', 'High-Quality Rendering', 'Fast Generation'],
        'tags': ['Image Generation', 'Open Model', 'Creative AI']
    },
    {
        'name': 'Stable Diffusion', 'category': 'Image', 'description': 'Open-source AI image generation model widely used for custom image creation and fine-tuning.',
        'website': 'https://stability.ai', 'pricing': 'Free/Open Source',
        'features': ['Text-to-Image', 'Image-to-Image', 'Model Fine-Tuning'],
        'tags': ['Open Source', 'Image Generation', 'AI Art']
    },
    {
        'name': 'Playground AI', 'category': 'Image', 'description': 'AI image creation platform offering multiple image models and editing capabilities.',
        'website': 'https://playground.com', 'pricing': 'Freemium',
        'features': ['Image Generation', 'Image Editing', 'Prompt Templates'],
        'tags': ['Image Generation', 'Creative', 'Design']
    },
    {
        'name': 'Recraft', 'category': 'Image', 'description': 'AI design tool focused on vector graphics, branding assets, and professional illustrations.',
        'website': 'https://www.recraft.ai', 'pricing': 'Freemium',
        'features': ['Vector Generation', 'Brand Assets', 'Illustrations'],
        'tags': ['Design', 'Vector Graphics', 'Branding']
    },
    {
        'name': 'DreamStudio', 'category': 'Image', 'description': 'Official Stable Diffusion platform for generating AI-powered images and artwork.',
        'website': 'https://dreamstudio.ai', 'pricing': 'Pay-as-you-go',
        'features': ['Text-to-Image', 'Image Variations', 'Prompt Controls'],
        'tags': ['Stable Diffusion', 'Image Generation', 'Creative AI']
    },
    # Video
    {
        'name': 'Sora', 'category': 'Video', 'description': "OpenAI's text-to-video AI model that generates realistic videos from natural language prompts.",
        'website': 'https://openai.com/sora', 'pricing': 'Paid',
        'features': ['Text-to-Video', 'Realistic Video Generation', 'Scene Creation'],
        'tags': ['Video Generation', 'OpenAI', 'Creative AI']
    },
    {
        'name': 'Runway', 'category': 'Video', 'description': 'AI-powered video generation and editing platform for creators and filmmakers.',
        'website': 'https://runwayml.com', 'pricing': 'Freemium',
        'features': ['Text-to-Video', 'Video Editing', 'Motion Tracking'],
        'tags': ['Video Generation', 'Editing', 'Creative AI']
    },
    {
        'name': 'Pika', 'category': 'Video', 'description': 'AI video generation platform that transforms text and images into animated videos.',
        'website': 'https://pika.art', 'pricing': 'Freemium',
        'features': ['Text-to-Video', 'Image-to-Video', 'Animation'],
        'tags': ['Video Generation', 'Animation', 'Creative AI']
    },
    {
        'name': 'Luma Dream Machine', 'category': 'Video', 'description': 'Generative AI platform for creating high-quality videos and cinematic scenes from prompts.',
        'website': 'https://lumalabs.ai', 'pricing': 'Freemium',
        'features': ['Video Generation', 'Cinematic Scenes', 'Text-to-Video'],
        'tags': ['Video', 'AI Generation', 'Creative']
    },
    {
        'name': 'Synthesia', 'category': 'Video', 'description': 'AI video platform for creating presenter-style videos using realistic avatars.',
        'website': 'https://www.synthesia.io', 'pricing': 'Paid',
        'features': ['AI Avatars', 'Text-to-Speech', 'Video Creation'],
        'tags': ['Avatar Video', 'Training Videos', 'Business']
    },
    {
        'name': 'HeyGen', 'category': 'Video', 'description': 'AI avatar video generator for marketing, training, and business communication.',
        'website': 'https://www.heygen.com', 'pricing': 'Freemium',
        'features': ['AI Avatars', 'Voice Cloning', 'Video Translation'],
        'tags': ['Avatar Video', 'Marketing', 'Business']
    },
    {
        'name': 'Kling AI', 'category': 'Video', 'description': 'Advanced AI video generation model known for realistic motion and cinematic quality.',
        'website': 'https://klingai.com', 'pricing': 'Freemium',
        'features': ['Text-to-Video', 'Realistic Motion', 'High-Quality Rendering'],
        'tags': ['Video Generation', 'AI Video', 'Creative']
    },
    {
        'name': 'Veo', 'category': 'Video', 'description': "Google's advanced video generation model capable of creating detailed videos from prompts.",
        'website': 'https://deepmind.google', 'pricing': 'Limited Access',
        'features': ['Text-to-Video', 'Cinematic Output', 'High Resolution'],
        'tags': ['Google AI', 'Video Generation', 'Creative']
    },
    {
        'name': 'Colossyan', 'category': 'Video', 'description': 'AI video creation platform focused on corporate training and educational content.',
        'website': 'https://www.colossyan.com', 'pricing': 'Paid',
        'features': ['AI Presenters', 'Training Videos', 'Multilingual Support'],
        'tags': ['Training', 'Corporate', 'Video AI']
    },
    {
        'name': 'Elai', 'category': 'Video', 'description': 'AI video generation platform that converts text into professional presenter-led videos.',
        'website': 'https://elai.io', 'pricing': 'Freemium',
        'features': ['AI Avatars', 'Text-to-Video', 'Voice Narration'],
        'tags': ['Video Creation', 'Avatar AI', 'Business']
    },
    # Audio
    {
        'name': 'ElevenLabs', 'category': 'Audio', 'description': 'AI voice generation platform known for realistic text-to-speech and voice cloning.',
        'website': 'https://elevenlabs.io', 'pricing': 'Freemium',
        'features': ['Text-to-Speech', 'Voice Cloning', 'Multilingual Voices'],
        'tags': ['Voice AI', 'Text-to-Speech', 'Audio Generation']
    },
    {
        'name': 'Murf AI', 'category': 'Audio', 'description': 'AI voiceover platform for creating professional narrations and presentations.',
        'website': 'https://murf.ai', 'pricing': 'Freemium',
        'features': ['Voiceovers', 'Text-to-Speech', 'Voice Customization'],
        'tags': ['Voice AI', 'Narration', 'Business']
    },
    {
        'name': 'Play.ht', 'category': 'Audio', 'description': 'AI voice generation and cloning platform for podcasts, videos, and applications.',
        'website': 'https://play.ht', 'pricing': 'Freemium',
        'features': ['Voice Cloning', 'Text-to-Speech', 'Audio Streaming'],
        'tags': ['Voice AI', 'Audio', 'Speech Synthesis']
    },
    {
        'name': 'Descript', 'category': 'Audio', 'description': 'AI-powered audio and video editing platform with transcription and voice cloning.',
        'website': 'https://www.descript.com', 'pricing': 'Freemium',
        'features': ['Audio Editing', 'Transcription', 'Voice Cloning'],
        'tags': ['Audio Editing', 'Podcasting', 'Video Editing']
    },
    {
        'name': 'Suno', 'category': 'Audio', 'description': 'AI music generation platform that creates complete songs from text prompts.',
        'website': 'https://suno.com', 'pricing': 'Freemium',
        'features': ['Music Generation', 'Lyrics Creation', 'Song Production'],
        'tags': ['Music AI', 'Song Generation', 'Creative AI']
    },
    {
        'name': 'Udio', 'category': 'Audio', 'description': 'AI music creation platform for generating high-quality songs and compositions.',
        'website': 'https://udio.com', 'pricing': 'Freemium',
        'features': ['Music Generation', 'Audio Production', 'Lyrics Support'],
        'tags': ['Music AI', 'Audio Creation', 'Creative']
    },
    {
        'name': 'Speechify', 'category': 'Audio', 'description': 'AI text-to-speech application that converts documents, articles, and books into audio.',
        'website': 'https://speechify.com', 'pricing': 'Freemium',
        'features': ['Text-to-Speech', 'Document Reading', 'Natural Voices'],
        'tags': ['Accessibility', 'Audio', 'Productivity']
    },
    {
        'name': 'Resemble AI', 'category': 'Audio', 'description': 'AI voice synthesis and cloning platform for creating custom voice experiences.',
        'website': 'https://www.resemble.ai', 'pricing': 'Paid',
        'features': ['Voice Cloning', 'Speech Synthesis', 'Custom AI Voices'],
        'tags': ['Voice AI', 'Speech', 'Synthetic Voice']
    },
    {
        'name': 'WellSaid Labs', 'category': 'Audio', 'description': 'Professional AI voice generation platform for training, education, and enterprise content.',
        'website': 'https://wellsaidlabs.com', 'pricing': 'Paid',
        'features': ['Professional Voiceovers', 'Text-to-Speech', 'Enterprise Audio'],
        'tags': ['Voiceover', 'Enterprise', 'Audio AI']
    },
    {
        'name': 'LOVO', 'category': 'Audio', 'description': 'AI voice generation and content creation platform with realistic synthetic voices.',
        'website': 'https://lovo.ai', 'pricing': 'Freemium',
        'features': ['Voice Generation', 'Text-to-Speech', 'Voice Library'],
        'tags': ['Voice AI', 'Content Creation', 'Audio']
    },
    # Coding
    {
        'name': 'Cursor', 'category': 'Coding', 'description': 'AI-powered code editor built on VS Code that helps developers write, edit, debug, and understand code using natural language.',
        'website': 'https://cursor.com', 'pricing': 'Freemium',
        'features': ['Code Generation', 'Codebase Chat', 'Bug Fixing'],
        'tags': ['Coding', 'IDE', 'Developer Tools']
    },
    {
        'name': 'Windsurf', 'category': 'Coding', 'description': 'AI-native development environment designed for autonomous software engineering and intelligent coding workflows.',
        'website': 'https://windsurf.com', 'pricing': 'Freemium',
        'features': ['AI Coding Agent', 'Code Generation', 'Repository Understanding'],
        'tags': ['Coding', 'IDE', 'AI Agent']
    },
    {
        'name': 'GitHub Copilot', 'category': 'Coding', 'description': 'AI coding assistant that provides code completions, suggestions, and programming support inside popular IDEs.',
        'website': 'https://github.com/features/copilot', 'pricing': 'Paid',
        'features': ['Code Completion', 'Code Suggestions', 'Chat Assistant'],
        'tags': ['Coding', 'Developer Tools', 'Programming']
    },
    {
        'name': 'Codeium', 'category': 'Coding', 'description': 'AI-powered coding assistant offering autocomplete, chat, and code generation across multiple IDEs.',
        'website': 'https://codeium.com', 'pricing': 'Freemium',
        'features': ['Autocomplete', 'Code Chat', 'Code Generation'],
        'tags': ['Coding', 'Programming', 'Developer Tools']
    },
    {
        'name': 'Amazon Q Developer', 'category': 'Coding', 'description': 'AWS-powered AI coding assistant for software development, debugging, and cloud application creation.',
        'website': 'https://aws.amazon.com/q', 'pricing': 'Freemium',
        'features': ['Code Generation', 'AWS Integration', 'Debugging Assistance'],
        'tags': ['Coding', 'AWS', 'Developer Tools']
    },
    {
        'name': 'Tabnine', 'category': 'Coding', 'description': 'AI code completion platform focused on developer productivity and enterprise privacy.',
        'website': 'https://www.tabnine.com', 'pricing': 'Freemium',
        'features': ['Code Completion', 'AI Suggestions', 'Private Deployment'],
        'tags': ['Coding', 'Autocomplete', 'Enterprise']
    },
    {
        'name': 'Sourcegraph Cody', 'category': 'Coding', 'description': 'AI coding assistant with deep codebase understanding and enterprise code search capabilities.',
        'website': 'https://sourcegraph.com/cody', 'pricing': 'Freemium',
        'features': ['Code Search', 'Codebase Understanding', 'AI Chat'],
        'tags': ['Coding', 'Code Search', 'Developer Tools']
    },
    {
        'name': 'Replit AI', 'category': 'Coding', 'description': 'AI-powered coding assistant integrated into Replit for app development and deployment.',
        'website': 'https://replit.com', 'pricing': 'Freemium',
        'features': ['Code Generation', 'App Development', 'Cloud Deployment'],
        'tags': ['Coding', 'Development', 'Cloud IDE']
    },
    {
        'name': 'Bolt.new', 'category': 'Coding', 'description': 'AI development platform that generates full-stack applications directly from prompts.',
        'website': 'https://bolt.new', 'pricing': 'Freemium',
        'features': ['Prompt-to-App', 'Full-Stack Development', 'Rapid Prototyping'],
        'tags': ['Coding', 'Website Builder', 'AI Development']
    },
    {
        'name': 'Continue.dev', 'category': 'Coding', 'description': 'Open-source AI coding assistant that integrates with popular IDEs and supports multiple AI models.',
        'website': 'https://continue.dev', 'pricing': 'Free/Open Source',
        'features': ['Open Source', 'Code Generation', 'IDE Integration'],
        'tags': ['Coding', 'Open Source', 'Developer Tools']
    },
    # Marketing
    {
        'name': 'Jasper', 'category': 'Marketing', 'description': 'AI marketing platform for creating blog posts, ad copy, social media content, and brand-consistent campaigns.',
        'website': 'https://www.jasper.ai', 'pricing': 'Paid',
        'features': ['Marketing Copy', 'Brand Voice', 'Campaign Creation'],
        'tags': ['Marketing', 'Content Creation', 'AI Writer']
    },
    {
        'name': 'Copy.ai', 'category': 'Marketing', 'description': 'AI-powered marketing and sales content generation platform for businesses and agencies.',
        'website': 'https://www.copy.ai', 'pricing': 'Freemium',
        'features': ['Copywriting', 'Sales Content', 'Marketing Automation'],
        'tags': ['Marketing', 'Copywriting', 'Content Creation']
    },
    {
        'name': 'Anyword', 'category': 'Marketing', 'description': 'AI copywriting platform focused on generating high-converting marketing content and advertisements.',
        'website': 'https://anyword.com', 'pricing': 'Paid',
        'features': ['Ad Copy', 'Performance Prediction', 'Marketing Content'],
        'tags': ['Marketing', 'Advertising', 'Copywriting']
    },
    {
        'name': 'AdCreative.ai', 'category': 'Marketing', 'description': 'AI platform for generating advertising creatives, banners, and social media marketing assets.',
        'website': 'https://www.adcreative.ai', 'pricing': 'Paid',
        'features': ['Ad Creatives', 'Banner Generation', 'Marketing Assets'],
        'tags': ['Marketing', 'Advertising', 'Design']
    },
    {
        'name': 'Ocoya', 'category': 'Marketing', 'description': 'AI social media management platform for content creation, scheduling, and analytics.',
        'website': 'https://www.ocoya.com', 'pricing': 'Freemium',
        'features': ['Social Media Posts', 'Scheduling', 'Analytics'],
        'tags': ['Marketing', 'Social Media', 'Content Creation']
    },
    {
        'name': 'Predis.ai', 'category': 'Marketing', 'description': 'AI-powered social media content creation and competitor analysis platform.',
        'website': 'https://predis.ai', 'pricing': 'Freemium',
        'features': ['Social Content', 'Competitor Analysis', 'Content Planning'],
        'tags': ['Marketing', 'Social Media', 'AI Content']
    },
    {
        'name': 'HubSpot AI', 'category': 'Marketing', 'description': 'AI tools integrated into HubSpot for content creation, CRM automation, and marketing optimization.',
        'website': 'https://www.hubspot.com', 'pricing': 'Freemium',
        'features': ['CRM Automation', 'Content Creation', 'Lead Management'],
        'tags': ['Marketing', 'CRM', 'Sales']
    },
    {
        'name': 'Surfer SEO', 'category': 'Marketing', 'description': 'AI-powered SEO optimization platform for improving search engine rankings and content quality.',
        'website': 'https://surferseo.com', 'pricing': 'Paid',
        'features': ['SEO Optimization', 'Keyword Research', 'Content Scoring'],
        'tags': ['Marketing', 'SEO', 'Content Optimization']
    },
    {
        'name': 'Frase', 'category': 'Marketing', 'description': 'AI content research and SEO writing platform for creating optimized blog posts and articles.',
        'website': 'https://www.frase.io', 'pricing': 'Paid',
        'features': ['SEO Writing', 'Content Research', 'Content Optimization'],
        'tags': ['Marketing', 'SEO', 'Content Creation']
    },
    {
        'name': 'Scalenut', 'category': 'Marketing', 'description': 'AI-powered SEO and content marketing platform for planning, creating, and optimizing content.',
        'website': 'https://www.scalenut.com', 'pricing': 'Freemium',
        'features': ['SEO Content', 'Keyword Planning', 'Content Optimization'],
        'tags': ['Marketing', 'SEO', 'Content Marketing']
    },
    # Productivity
    {
        'name': 'Notion AI', 'category': 'Productivity', 'description': 'AI-powered workspace assistant that helps users write, summarize, organize notes, and manage projects.',
        'website': 'https://www.notion.so/product/ai', 'pricing': 'Freemium',
        'features': ['Writing Assistant', 'Summarization', 'Knowledge Management'],
        'tags': ['Productivity', 'Notes', 'Workspace']
    },
    {
        'name': 'Motion', 'category': 'Productivity', 'description': 'AI scheduling and task management platform that automatically plans your day and prioritizes work.',
        'website': 'https://www.usemotion.com', 'pricing': 'Paid',
        'features': ['Task Scheduling', 'Calendar Management', 'Priority Planning'],
        'tags': ['Productivity', 'Scheduling', 'Task Management']
    },
    {
        'name': 'Mem AI', 'category': 'Productivity', 'description': 'AI-powered note-taking and knowledge management platform that organizes information automatically.',
        'website': 'https://mem.ai', 'pricing': 'Freemium',
        'features': ['Smart Notes', 'Knowledge Retrieval', 'AI Search'],
        'tags': ['Productivity', 'Notes', 'Knowledge Management']
    },
    {
        'name': 'Taskade', 'category': 'Productivity', 'description': 'AI productivity platform for project management, team collaboration, and workflow automation.',
        'website': 'https://www.taskade.com', 'pricing': 'Freemium',
        'features': ['Project Management', 'AI Agents', 'Team Collaboration'],
        'tags': ['Productivity', 'Collaboration', 'Project Management']
    },
    {
        'name': 'ClickUp AI', 'category': 'Productivity', 'description': 'AI-powered project management assistant integrated into ClickUp for teams and businesses.',
        'website': 'https://clickup.com', 'pricing': 'Paid',
        'features': ['Project Planning', 'Task Automation', 'Content Generation'],
        'tags': ['Productivity', 'Project Management', 'Collaboration']
    },
    {
        'name': 'Fireflies.ai', 'category': 'Productivity', 'description': 'AI meeting assistant that records, transcribes, summarizes, and analyzes conversations.',
        'website': 'https://fireflies.ai', 'pricing': 'Freemium',
        'features': ['Meeting Recording', 'Transcription', 'Meeting Summaries'],
        'tags': ['Productivity', 'Meetings', 'Transcription']
    },
    {
        'name': 'Otter.ai', 'category': 'Productivity', 'description': 'AI-powered meeting transcription and collaboration platform for teams and professionals.',
        'website': 'https://otter.ai', 'pricing': 'Freemium',
        'features': ['Live Transcription', 'Meeting Notes', 'Collaboration'],
        'tags': ['Productivity', 'Meetings', 'Transcription']
    },
    {
        'name': 'Fellow', 'category': 'Productivity', 'description': 'AI meeting management platform that helps teams run effective meetings and track action items.',
        'website': 'https://fellow.app', 'pricing': 'Freemium',
        'features': ['Meeting Agendas', 'Action Items', 'Meeting Summaries'],
        'tags': ['Productivity', 'Meetings', 'Team Collaboration']
    },
    {
        'name': 'Rewind AI', 'category': 'Productivity', 'description': 'AI-powered personal knowledge assistant that records and retrieves information from your digital activity.',
        'website': 'https://www.rewind.ai', 'pricing': 'Paid',
        'features': ['Memory Search', 'Activity Recall', 'Knowledge Retrieval'],
        'tags': ['Productivity', 'Knowledge Management', 'AI Assistant']
    },
    {
        'name': 'Magical', 'category': 'Productivity', 'description': 'AI automation tool that helps users save time through text expansion and workflow automation.',
        'website': 'https://www.getmagical.com', 'pricing': 'Freemium',
        'features': ['Text Expansion', 'Workflow Automation', 'Productivity Tools'],
        'tags': ['Productivity', 'Automation', 'Workflow']
    },
    # Research
    {
        'name': 'Perplexity', 'category': 'Research', 'description': 'AI-powered search and answer engine that provides real-time information with source citations.',
        'website': 'https://www.perplexity.ai', 'pricing': 'Freemium',
        'features': ['AI Search', 'Source Citations', 'Research Assistance'],
        'tags': ['Research', 'Search Engine', 'AI Assistant']
    },
    {
        'name': 'Perplexity Labs', 'category': 'Research', 'description': 'Advanced AI research workspace for conducting deep research, analysis, and report generation.',
        'website': 'https://www.perplexity.ai', 'pricing': 'Freemium',
        'features': ['Deep Research', 'Report Generation', 'Source Analysis'],
        'tags': ['Research', 'Knowledge Discovery', 'AI Workspace']
    },
    {
        'name': 'You.com', 'category': 'Research', 'description': 'AI search and productivity platform that combines web search, chat, and research tools.',
        'website': 'https://you.com', 'pricing': 'Freemium',
        'features': ['AI Search', 'Research Assistant', 'Productivity Tools'],
        'tags': ['Research', 'Search', 'AI Assistant']
    },
    {
        'name': 'Elicit', 'category': 'Research', 'description': 'AI research assistant that helps users find, summarize, and analyze academic papers.',
        'website': 'https://elicit.com', 'pricing': 'Freemium',
        'features': ['Paper Search', 'Research Summaries', 'Literature Review'],
        'tags': ['Research', 'Academics', 'Scientific Papers']
    },
    {
        'name': 'Consensus', 'category': 'Research', 'description': 'AI-powered academic search engine that provides evidence-based answers from scientific studies.',
        'website': 'https://consensus.app', 'pricing': 'Freemium',
        'features': ['Scientific Search', 'Evidence-Based Answers', 'Paper Analysis'],
        'tags': ['Research', 'Science', 'Academic Search']
    },
    {
        'name': 'Scite', 'category': 'Research', 'description': 'Research platform that helps users understand how scientific papers are cited and discussed.',
        'website': 'https://scite.ai', 'pricing': 'Freemium',
        'features': ['Citation Analysis', 'Research Discovery', 'Paper Insights'],
        'tags': ['Research', 'Citations', 'Scientific Literature']
    },
    {
        'name': 'Semantic Scholar AI', 'category': 'Research', 'description': 'AI-enhanced academic search engine for discovering and understanding scientific literature.',
        'website': 'https://www.semanticscholar.org', 'pricing': 'Free',
        'features': ['Academic Search', 'Paper Recommendations', 'Research Discovery'],
        'tags': ['Research', 'Science', 'Academic']
    },
    {
        'name': 'ChatGPT Deep Research', 'category': 'Research', 'description': 'Advanced research mode within ChatGPT designed for multi-step analysis and comprehensive information gathering.',
        'website': 'https://chatgpt.com', 'pricing': 'Paid',
        'features': ['Deep Research', 'Multi-Step Analysis', 'Report Generation'],
        'tags': ['Research', 'AI Assistant', 'Knowledge Discovery']
    },
    {
        'name': 'Gemini Deep Research', 'category': 'Research', 'description': "Google Gemini's advanced research capability for investigating topics and generating detailed reports.",
        'website': 'https://gemini.google.com', 'pricing': 'Paid',
        'features': ['Research Automation', 'Information Synthesis', 'Detailed Reports'],
        'tags': ['Research', 'Google AI', 'Knowledge Discovery']
    },
    {
        'name': 'Research Rabbit', 'category': 'Research', 'description': 'AI-powered research discovery platform that helps users explore academic papers and citation networks.',
        'website': 'https://www.researchrabbit.ai', 'pricing': 'Free',
        'features': ['Paper Discovery', 'Citation Networks', 'Research Mapping'],
        'tags': ['Research', 'Academic', 'Knowledge Graph']
    },
    # Data
    {
        'name': 'Pinecone', 'category': 'Data', 'description': 'Managed vector database platform for storing and searching AI embeddings at scale.',
        'website': 'https://www.pinecone.io', 'pricing': 'Freemium',
        'features': ['Vector Search', 'Embeddings Storage', 'Semantic Search'],
        'tags': ['Vector Database', 'RAG', 'AI Infrastructure']
    },
    {
        'name': 'Weaviate', 'category': 'Data', 'description': 'Open-source vector database designed for semantic search, recommendation systems, and AI applications.',
        'website': 'https://weaviate.io', 'pricing': 'Freemium',
        'features': ['Vector Search', 'Hybrid Search', 'Knowledge Graph'],
        'tags': ['Vector Database', 'Semantic Search', 'Open Source']
    },
    {
        'name': 'Chroma', 'category': 'Data', 'description': 'Open-source embedding database built specifically for AI applications and retrieval systems.',
        'website': 'https://www.trychroma.com', 'pricing': 'Free/Open Source',
        'features': ['Embedding Storage', 'Vector Search', 'Developer Friendly'],
        'tags': ['Vector Database', 'RAG', 'Open Source']
    },
    {
        'name': 'Milvus', 'category': 'Data', 'description': 'High-performance open-source vector database for similarity search and AI workloads.',
        'website': 'https://milvus.io', 'pricing': 'Free/Open Source',
        'features': ['Vector Search', 'Scalable Storage', 'AI Retrieval'],
        'tags': ['Vector Database', 'Machine Learning', 'Open Source']
    },
    {
        'name': 'Qdrant', 'category': 'Data', 'description': 'Vector similarity search engine optimized for AI-powered search and recommendation systems.',
        'website': 'https://qdrant.tech', 'pricing': 'Freemium',
        'features': ['Vector Search', 'Filtering', 'Recommendation Engine'],
        'tags': ['Vector Database', 'Search', 'AI Infrastructure']
    },
    {
        'name': 'DataRobot', 'category': 'Data', 'description': 'Enterprise AI and machine learning platform for predictive analytics and data science automation.',
        'website': 'https://www.datarobot.com', 'pricing': 'Enterprise',
        'features': ['AutoML', 'Predictive Analytics', 'Model Deployment'],
        'tags': ['Data Science', 'Machine Learning', 'Enterprise AI']
    },
    {
        'name': 'Snowflake Cortex', 'category': 'Data', 'description': 'AI and machine learning capabilities integrated into the Snowflake data cloud platform.',
        'website': 'https://www.snowflake.com', 'pricing': 'Usage-Based',
        'features': ['LLM Integration', 'Data Analytics', 'AI Functions'],
        'tags': ['Data Platform', 'Analytics', 'AI Infrastructure']
    },
    {
        'name': 'Databricks Mosaic AI', 'category': 'Data', 'description': 'Databricks AI platform for building, deploying, and managing generative AI applications.',
        'website': 'https://www.databricks.com', 'pricing': 'Enterprise',
        'features': ['Model Training', 'LLM Operations', 'Data Pipelines'],
        'tags': ['Data Engineering', 'AI Platform', 'Machine Learning']
    },
    {
        'name': 'MongoDB Atlas Vector Search', 'category': 'Data', 'description': 'Vector search capabilities integrated directly into MongoDB Atlas for AI-powered applications.',
        'website': 'https://www.mongodb.com', 'pricing': 'Usage-Based',
        'features': ['Vector Search', 'Database Integration', 'Semantic Retrieval'],
        'tags': ['Database', 'Vector Search', 'AI Applications']
    },
    {
        'name': 'LanceDB', 'category': 'Data', 'description': 'Open-source vector database designed for multimodal AI applications and large-scale retrieval.',
        'website': 'https://lancedb.com', 'pricing': 'Free/Open Source',
        'features': ['Vector Storage', 'Multimodal Search', 'AI Retrieval'],
        'tags': ['Vector Database', 'Open Source', 'Data Infrastructure']
    },
    # Cybersecurity
    {
        'name': 'CrowdStrike Charlotte AI', 'category': 'Cybersecurity', 'description': 'Generative AI security assistant built into the CrowdStrike Falcon platform for threat investigation and incident response.',
        'website': 'https://www.crowdstrike.com', 'pricing': 'Enterprise',
        'features': ['Threat Investigation', 'Incident Response', 'Security Analysis'],
        'tags': ['Cybersecurity', 'Threat Detection', 'SOC']
    },
    {
        'name': 'Microsoft Security Copilot', 'category': 'Cybersecurity', 'description': 'AI-powered cybersecurity assistant that helps analysts investigate threats, incidents, and vulnerabilities.',
        'website': 'https://www.microsoft.com/security/business/ai-machine-learning/microsoft-security-copilot', 'pricing': 'Enterprise',
        'features': ['Threat Analysis', 'Security Automation', 'Incident Investigation'],
        'tags': ['Cybersecurity', 'Microsoft', 'Security Operations']
    },
    {
        'name': 'Darktrace', 'category': 'Cybersecurity', 'description': 'AI-driven cybersecurity platform that detects, investigates, and responds to cyber threats in real time.',
        'website': 'https://www.darktrace.com', 'pricing': 'Enterprise',
        'features': ['Threat Detection', 'Anomaly Detection', 'Autonomous Response'],
        'tags': ['Cybersecurity', 'Threat Detection', 'Network Security']
    },
    {
        'name': 'SentinelOne Purple AI', 'category': 'Cybersecurity', 'description': 'AI security analyst that assists with threat hunting, investigation, and cybersecurity operations.',
        'website': 'https://www.sentinelone.com', 'pricing': 'Enterprise',
        'features': ['Threat Hunting', 'Security Analysis', 'Incident Response'],
        'tags': ['Cybersecurity', 'Endpoint Security', 'Threat Intelligence']
    },
    {
        'name': 'Wiz AI', 'category': 'Cybersecurity', 'description': 'AI-powered cloud security platform that identifies risks, vulnerabilities, and security exposures.',
        'website': 'https://www.wiz.io', 'pricing': 'Enterprise',
        'features': ['Cloud Security', 'Risk Detection', 'Security Insights'],
        'tags': ['Cybersecurity', 'Cloud Security', 'Risk Management']
    },
    {
        'name': 'Palo Alto Cortex AI', 'category': 'Cybersecurity', 'description': 'AI-powered security operations platform for threat detection, investigation, and automated response.',
        'website': 'https://www.paloaltonetworks.com', 'pricing': 'Enterprise',
        'features': ['Threat Detection', 'Security Automation', 'Incident Response'],
        'tags': ['Cybersecurity', 'SOC', 'Threat Intelligence']
    },
    {
        'name': 'Vectra AI', 'category': 'Cybersecurity', 'description': 'AI-driven threat detection and response platform focused on hybrid and cloud environments.',
        'website': 'https://www.vectra.ai', 'pricing': 'Enterprise',
        'features': ['Threat Detection', 'Cloud Security', 'Attack Detection'],
        'tags': ['Cybersecurity', 'Cloud Security', 'Threat Detection']
    },
    {
        'name': 'Recorded Future AI', 'category': 'Cybersecurity', 'description': 'Threat intelligence platform that uses AI to analyze cyber risks and provide security insights.',
        'website': 'https://www.recordedfuture.com', 'pricing': 'Enterprise',
        'features': ['Threat Intelligence', 'Risk Analysis', 'Security Research'],
        'tags': ['Cybersecurity', 'Threat Intelligence', 'Risk Management']
    },
    {
        'name': 'Cybereason AI', 'category': 'Cybersecurity', 'description': 'AI-powered cybersecurity platform for endpoint protection, threat hunting, and attack prevention.',
        'website': 'https://www.cybereason.com', 'pricing': 'Enterprise',
        'features': ['Endpoint Protection', 'Threat Hunting', 'Attack Prevention'],
        'tags': ['Cybersecurity', 'Endpoint Security', 'Threat Detection']
    },
    {
        'name': 'Elastic Security AI', 'category': 'Cybersecurity', 'description': 'AI-enhanced security analytics platform built on Elastic Search for threat detection and monitoring.',
        'website': 'https://www.elastic.co/security', 'pricing': 'Freemium',
        'features': ['Security Analytics', 'Threat Detection', 'Log Analysis'],
        'tags': ['Cybersecurity', 'Security Analytics', 'Monitoring']
    },
    # Finance
    {
        'name': 'AlphaSense', 'category': 'Finance', 'description': 'AI-powered market intelligence and financial research platform used by investment professionals.',
        'website': 'https://www.alpha-sense.com', 'pricing': 'Enterprise',
        'features': ['Financial Research', 'Market Intelligence', 'Document Search'],
        'tags': ['Finance', 'Research', 'Investment Analysis']
    },
    {
        'name': 'BloombergGPT', 'category': 'Finance', 'description': 'Large language model developed for financial analysis, market intelligence, and business data understanding.',
        'website': 'https://www.bloomberg.com', 'pricing': 'Enterprise',
        'features': ['Financial Analysis', 'Market Intelligence', 'Language Understanding'],
        'tags': ['Finance', 'LLM', 'Financial Data']
    },
    {
        'name': 'Hebbia', 'category': 'Finance', 'description': 'AI research platform that helps analysts extract insights from large financial and business documents.',
        'website': 'https://www.hebbia.com', 'pricing': 'Enterprise',
        'features': ['Document Analysis', 'Research Automation', 'Knowledge Extraction'],
        'tags': ['Finance', 'Research', 'Document AI']
    },
    {
        'name': 'Uptrends AI', 'category': 'Finance', 'description': 'AI-powered stock market monitoring and investment research platform.',
        'website': 'https://www.uptrends.ai', 'pricing': 'Freemium',
        'features': ['Stock Monitoring', 'Market Trends', 'Investment Research'],
        'tags': ['Finance', 'Stocks', 'Market Analysis']
    },
    {
        'name': 'FinChat', 'category': 'Finance', 'description': 'AI investment research assistant providing financial data, stock analysis, and company insights.',
        'website': 'https://finchat.io', 'pricing': 'Freemium',
        'features': ['Stock Analysis', 'Financial Data', 'Investment Research'],
        'tags': ['Finance', 'Investing', 'Stocks']
    },
    {
        'name': 'Kavout', 'category': 'Finance', 'description': 'AI-driven investment platform that uses machine learning to evaluate stocks and market opportunities.',
        'website': 'https://www.kavout.com', 'pricing': 'Paid',
        'features': ['Stock Ranking', 'Market Prediction', 'Investment Insights'],
        'tags': ['Finance', 'Machine Learning', 'Investing']
    },
    {
        'name': 'Magnifi', 'category': 'Finance', 'description': 'AI-powered investment assistant that helps users discover and evaluate investment opportunities.',
        'website': 'https://magnifi.com', 'pricing': 'Paid',
        'features': ['Investment Search', 'Portfolio Insights', 'Financial Guidance'],
        'tags': ['Finance', 'Investments', 'Wealth Management']
    },
    {
        'name': 'TIFIN', 'category': 'Finance', 'description': 'AI platform providing personalized wealth management and financial advisory solutions.',
        'website': 'https://tifin.com', 'pricing': 'Enterprise',
        'features': ['Wealth Management', 'Financial Personalization', 'Investment Recommendations'],
        'tags': ['Finance', 'Wealth Management', 'Advisory']
    },
    {
        'name': 'Zest AI', 'category': 'Finance', 'description': 'AI-powered lending intelligence platform helping financial institutions improve credit decisions.',
        'website': 'https://www.zest.ai', 'pricing': 'Enterprise',
        'features': ['Credit Risk Analysis', 'Loan Underwriting', 'Financial Modeling'],
        'tags': ['Finance', 'Lending', 'Risk Assessment']
    },
    {
        'name': 'Numerai', 'category': 'Finance', 'description': 'AI-driven hedge fund platform that leverages machine learning models from a global data science community.',
        'website': 'https://numer.ai', 'pricing': 'Free',
        'features': ['Machine Learning Models', 'Hedge Fund Analytics', 'Crowdsourced Predictions'],
        'tags': ['Finance', 'Machine Learning', 'Quantitative Trading']
    },
    # Legal
    {
        'name': 'Harvey', 'category': 'Legal', 'description': 'AI legal assistant designed for law firms and legal professionals to streamline research, drafting, and case analysis.',
        'website': 'https://www.harvey.ai', 'pricing': 'Enterprise',
        'features': ['Legal Research', 'Contract Drafting', 'Case Analysis'],
        'tags': ['Legal', 'Law Firm', 'Research']
    },
    {
        'name': 'CoCounsel', 'category': 'Legal', 'description': 'AI legal assistant that helps lawyers perform research, document review, and legal drafting tasks.',
        'website': 'https://casetext.com/cocounsel', 'pricing': 'Paid',
        'features': ['Legal Research', 'Document Review', 'Contract Analysis'],
        'tags': ['Legal', 'AI Assistant', 'Law']
    },
    {
        'name': 'Lexis+ AI', 'category': 'Legal', 'description': 'Generative AI platform integrated into LexisNexis for legal research and drafting workflows.',
        'website': 'https://www.lexisnexis.com', 'pricing': 'Enterprise',
        'features': ['Legal Search', 'Drafting Assistance', 'Case Law Analysis'],
        'tags': ['Legal', 'Research', 'Law Practice']
    },
    {
        'name': 'Casetext', 'category': 'Legal', 'description': 'AI-powered legal research platform helping attorneys find cases and analyze legal documents.',
        'website': 'https://casetext.com', 'pricing': 'Paid',
        'features': ['Case Research', 'Document Analysis', 'Legal Search'],
        'tags': ['Legal', 'Case Law', 'Research']
    },
    {
        'name': 'Spellbook', 'category': 'Legal', 'description': 'AI contract drafting and review assistant built specifically for legal professionals.',
        'website': 'https://www.spellbook.legal', 'pricing': 'Paid',
        'features': ['Contract Drafting', 'Clause Suggestions', 'Legal Review'],
        'tags': ['Legal', 'Contracts', 'Drafting']
    },
    {
        'name': 'Luminance', 'category': 'Legal', 'description': 'AI platform for contract review, due diligence, and legal document analysis.',
        'website': 'https://www.luminance.com', 'pricing': 'Enterprise',
        'features': ['Contract Review', 'Due Diligence', 'Document Analysis'],
        'tags': ['Legal', 'Contract Management', 'Compliance']
    },
    {
        'name': 'Ironclad AI', 'category': 'Legal', 'description': 'AI-enhanced contract lifecycle management platform for legal teams and enterprises.',
        'website': 'https://ironcladapp.com', 'pricing': 'Enterprise',
        'features': ['Contract Lifecycle Management', 'Workflow Automation', 'Legal Operations'],
        'tags': ['Legal', 'Contracts', 'Enterprise']
    },
    {
        'name': 'Eudia', 'category': 'Legal', 'description': 'AI legal operations platform designed to improve efficiency and decision-making for legal teams.',
        'website': 'https://www.eudia.com', 'pricing': 'Enterprise',
        'features': ['Legal Operations', 'Workflow Automation', 'Knowledge Management'],
        'tags': ['Legal', 'Operations', 'Enterprise AI']
    },
    {
        'name': 'Robin AI', 'category': 'Legal', 'description': 'AI contract assistant that helps businesses draft, review, and negotiate legal agreements.',
        'website': 'https://www.robinai.com', 'pricing': 'Paid',
        'features': ['Contract Review', 'Negotiation Support', 'Legal Drafting'],
        'tags': ['Legal', 'Contracts', 'Business']
    },
    {
        'name': 'LawGeex', 'category': 'Legal', 'description': 'AI contract review platform that automates legal document review and compliance checks.',
        'website': 'https://www.lawgeex.com', 'pricing': 'Enterprise',
        'features': ['Contract Review', 'Compliance Checks', 'Legal Automation'],
        'tags': ['Legal', 'Compliance', 'Contract Analysis']
    },
    # Design
    {
        'name': 'Canva AI', 'category': 'Design', 'description': 'AI-powered design platform for creating presentations, social media graphics, marketing materials, and visual content.',
        'website': 'https://www.canva.com', 'pricing': 'Freemium',
        'features': ['Graphic Design', 'Presentation Creation', 'AI Image Generation'],
        'tags': ['Design', 'Graphics', 'Content Creation']
    },
    {
        'name': 'Figma AI', 'category': 'Design', 'description': 'AI-enhanced design platform for UI/UX design, prototyping, wireframing, and team collaboration.',
        'website': 'https://www.figma.com', 'pricing': 'Freemium',
        'features': ['UI Design', 'Prototyping', 'Design Automation'],
        'tags': ['Design', 'UI/UX', 'Collaboration']
    },
    {
        'name': 'Adobe Express AI', 'category': 'Design', 'description': 'AI-powered creative design platform for generating graphics, social content, and marketing assets.',
        'website': 'https://www.adobe.com/express', 'pricing': 'Freemium',
        'features': ['Graphic Creation', 'Content Design', 'AI Templates'],
        'tags': ['Design', 'Adobe', 'Marketing']
    },
    {
        'name': 'Uizard', 'category': 'Design', 'description': 'AI design platform that converts ideas, sketches, and text prompts into UI mockups and prototypes.',
        'website': 'https://uizard.io', 'pricing': 'Freemium',
        'features': ['Wireframing', 'UI Mockups', 'Design Generation'],
        'tags': ['Design', 'UI/UX', 'Prototyping']
    },
    {
        'name': 'Galileo AI', 'category': 'Design', 'description': 'AI-powered interface design tool that generates high-fidelity UI designs from text descriptions.',
        'website': 'https://www.usegalileo.ai', 'pricing': 'Paid',
        'features': ['UI Generation', 'Design Prototypes', 'Prompt-to-Design'],
        'tags': ['Design', 'UI Design', 'AI Generation']
    },
    {
        'name': 'Framer AI', 'category': 'Design', 'description': 'AI website and design platform that creates responsive web pages and landing pages from prompts.',
        'website': 'https://www.framer.com', 'pricing': 'Freemium',
        'features': ['Website Design', 'Landing Pages', 'Prompt-to-Website'],
        'tags': ['Design', 'Website Builder', 'No-Code']
    },
    {
        'name': 'Visily', 'category': 'Design', 'description': 'AI-assisted UI design tool that helps teams quickly create wireframes and prototypes.',
        'website': 'https://www.visily.ai', 'pricing': 'Freemium',
        'features': ['Wireframing', 'UI Design', 'Team Collaboration'],
        'tags': ['Design', 'Wireframes', 'UI/UX']
    },
    {
        'name': 'Khroma', 'category': 'Design', 'description': 'AI color palette generator that helps designers discover and create personalized color schemes.',
        'website': 'https://www.khroma.co', 'pricing': 'Free',
        'features': ['Color Palette Generation', 'Color Recommendations', 'Design Inspiration'],
        'tags': ['Design', 'Colors', 'Branding']
    },
    {
        'name': 'Designs.ai', 'category': 'Design', 'description': 'AI creative suite for generating logos, graphics, videos, voiceovers, and marketing materials.',
        'website': 'https://designs.ai', 'pricing': 'Freemium',
        'features': ['Logo Creation', 'Graphic Design', 'Marketing Assets'],
        'tags': ['Design', 'Branding', 'Creative Suite']
    },
    {
        'name': 'Microsoft Designer', 'category': 'Design', 'description': 'AI-powered graphic design tool for creating social media posts, invitations, banners, and visual content.',
        'website': 'https://designer.microsoft.com', 'pricing': 'Freemium',
        'features': ['Graphic Design', 'Image Generation', 'Content Creation'],
        'tags': ['Design', 'Microsoft', 'Creative AI']
    },
    # Website Builder
    {
        'name': 'Lovable', 'category': 'Website Builder', 'description': 'AI-powered platform that creates full-stack web applications from natural language prompts.',
        'website': 'https://lovable.dev', 'pricing': 'Freemium',
        'features': ['Prompt-to-App', 'Full-Stack Development', 'Code Export'],
        'tags': ['Website Builder', 'AI Development', 'No-Code']
    },
    {
        'name': 'Bolt.new', 'category': 'Website Builder', 'description': 'AI development platform that generates and deploys full-stack applications directly from prompts.',
        'website': 'https://bolt.new', 'pricing': 'Freemium',
        'features': ['Prompt-to-Website', 'Full-Stack Apps', 'Instant Deployment'],
        'tags': ['Website Builder', 'AI Coding', 'Development']
    },
    {
        'name': 'v0', 'category': 'Website Builder', 'description': 'AI website generation tool from Vercel that creates modern web interfaces from prompts.',
        'website': 'https://v0.dev', 'pricing': 'Freemium',
        'features': ['UI Generation', 'React Components', 'Prompt-to-Code'],
        'tags': ['Website Builder', 'Frontend', 'Vercel']
    },
    {
        'name': 'Replit AI', 'category': 'Website Builder', 'description': 'AI-powered development environment that can generate, build, and deploy websites from prompts.',
        'website': 'https://replit.com', 'pricing': 'Freemium',
        'features': ['Website Creation', 'Code Generation', 'Cloud Deployment'],
        'tags': ['Website Builder', 'Coding', 'Cloud IDE']
    },
    {
        'name': 'Cursor', 'category': 'Website Builder', 'description': 'AI-first code editor that helps developers build websites and applications using natural language.',
        'website': 'https://cursor.com', 'pricing': 'Freemium',
        'features': ['Code Generation', 'Website Development', 'AI Chat'],
        'tags': ['Website Builder', 'Developer Tools', 'Coding']
    },
    {
        'name': 'Windsurf', 'category': 'Website Builder', 'description': 'AI-native IDE capable of generating, editing, and deploying complete web applications.',
        'website': 'https://windsurf.com', 'pricing': 'Freemium',
        'features': ['AI Agent', 'Website Generation', 'Full-Stack Development'],
        'tags': ['Website Builder', 'Coding', 'AI Development']
    },
    {
        'name': 'Framer AI', 'category': 'Website Builder', 'description': 'AI website builder that creates responsive websites and landing pages from text prompts.',
        'website': 'https://www.framer.com', 'pricing': 'Freemium',
        'features': ['Prompt-to-Website', 'Landing Pages', 'Visual Editing'],
        'tags': ['Website Builder', 'No-Code', 'Design']
    },
    {
        'name': 'Webflow AI', 'category': 'Website Builder', 'description': 'AI-assisted website design and development platform for building professional websites visually.',
        'website': 'https://webflow.com', 'pricing': 'Freemium',
        'features': ['Visual Development', 'AI Content', 'Responsive Design'],
        'tags': ['Website Builder', 'No-Code', 'Design']
    },
    {
        'name': 'Durable', 'category': 'Website Builder', 'description': 'AI website builder that generates complete business websites in minutes.',
        'website': 'https://durable.co', 'pricing': 'Freemium',
        'features': ['Business Websites', 'AI Content', 'CRM Integration'],
        'tags': ['Website Builder', 'Small Business', 'No-Code']
    },
    {
        'name': 'Hostinger Horizons', 'category': 'Website Builder', 'description': 'AI-powered website creation platform that builds websites, web apps, and online tools from prompts.',
        'website': 'https://www.hostinger.com/horizons', 'pricing': 'Paid',
        'features': ['Prompt-to-WebApp', 'Website Creation', 'Hosting Integration'],
        'tags': ['Website Builder', 'AI Development', 'Hosting']
    },
    # Repository
    {
        'name': 'LangChain', 'category': 'Repository', 'description': 'Framework for building LLM-powered applications, agents, and RAG systems.',
        'website': 'https://www.langchain.com', 'pricing': 'Free/Open Source',
        'features': ['Agents', 'RAG', 'Tool Calling'],
        'tags': ['Framework', 'LLM', 'Open Source']
    },
    {
        'name': 'LangGraph', 'category': 'Repository', 'description': 'Agent orchestration framework for building stateful AI agents and workflows.',
        'website': 'https://langchain-ai.github.io/langgraph', 'pricing': 'Free/Open Source',
        'features': ['Agent Workflows', 'State Management', 'Multi-Agent Systems'],
        'tags': ['Agents', 'Workflow', 'Open Source']
    },
    {
        'name': 'LlamaIndex', 'category': 'Repository', 'description': 'Framework for connecting LLMs with private and enterprise data.',
        'website': 'https://www.llamaindex.ai', 'pricing': 'Free/Open Source',
        'features': ['RAG', 'Data Connectors', 'Knowledge Bases'],
        'tags': ['RAG', 'Data', 'LLM']
    },
    {
        'name': 'CrewAI', 'category': 'Repository', 'description': 'Multi-agent framework for collaborative AI agents.',
        'website': 'https://www.crewai.com', 'pricing': 'Free/Open Source',
        'features': ['Multi-Agent Systems', 'Task Delegation', 'Workflows'],
        'tags': ['Agents', 'Automation', 'Open Source']
    },
    {
        'name': 'AutoGen', 'category': 'Repository', 'description': 'Microsoft framework for creating AI agents that collaborate autonomously.',
        'website': 'https://microsoft.github.io/autogen', 'pricing': 'Free/Open Source',
        'features': ['Multi-Agent Chat', 'Automation', 'Task Solving'],
        'tags': ['Microsoft', 'Agents', 'Open Source']
    },
    {
        'name': 'Flowise', 'category': 'Repository', 'description': 'Visual drag-and-drop builder for LangChain and AI workflows.',
        'website': 'https://flowiseai.com', 'pricing': 'Free/Open Source',
        'features': ['Visual Builder', 'RAG', 'Workflow Design'],
        'tags': ['No-Code', 'AI Builder', 'Open Source']
    },
    {
        'name': 'OpenHands', 'category': 'Repository', 'description': 'Open-source AI software engineering agent for coding tasks.',
        'website': 'https://github.com/All-Hands-AI/OpenHands', 'pricing': 'Free/Open Source',
        'features': ['Coding Agent', 'Software Development', 'Automation'],
        'tags': ['Coding', 'Agent', 'Open Source']
    },
    {
        'name': 'Haystack', 'category': 'Repository', 'description': 'Framework for building production-grade search and RAG applications.',
        'website': 'https://haystack.deepset.ai', 'pricing': 'Free/Open Source',
        'features': ['Search', 'RAG', 'Pipelines'],
        'tags': ['Search', 'LLM', 'Open Source']
    },
    {
        'name': 'Semantic Kernel', 'category': 'Repository', 'description': 'Microsoft SDK for integrating AI into applications and workflows.',
        'website': 'https://learn.microsoft.com/semantic-kernel', 'pricing': 'Free/Open Source',
        'features': ['AI Integration', 'Plugins', 'Agent Framework'],
        'tags': ['Microsoft', 'SDK', 'AI']
    },
    {
        'name': 'DSPy', 'category': 'Repository', 'description': 'Framework for programming and optimizing LLM workflows.',
        'website': 'https://dspy.ai', 'pricing': 'Free/Open Source',
        'features': ['Prompt Optimization', 'LLM Programming', 'Automation'],
        'tags': ['LLM', 'Optimization', 'Research']
    },
    {
        'name': 'vLLM', 'category': 'Repository', 'description': 'High-performance inference engine for serving large language models.',
        'website': 'https://github.com/vllm-project/vllm', 'pricing': 'Free/Open Source',
        'features': ['Model Serving', 'Inference', 'Scalability'],
        'tags': ['LLM', 'Inference', 'Infrastructure']
    },
    {
        'name': 'Ollama', 'category': 'Repository', 'description': 'Platform for running open-source LLMs locally.',
        'website': 'https://ollama.com', 'pricing': 'Free/Open Source',
        'features': ['Local Models', 'Inference', 'Model Management'],
        'tags': ['LLM', 'Local AI', 'Open Source']
    },
    {
        'name': 'LiteLLM', 'category': 'Repository', 'description': 'Unified API layer for multiple LLM providers.',
        'website': 'https://www.litellm.ai', 'pricing': 'Free/Open Source',
        'features': ['Multi-Model Support', 'API Gateway', 'LLM Routing'],
        'tags': ['LLM', 'API', 'Infrastructure']
    },
    {
        'name': 'Open WebUI', 'category': 'Repository', 'description': 'Self-hosted ChatGPT-style interface for local and cloud models.',
        'website': 'https://openwebui.com', 'pricing': 'Free/Open Source',
        'features': ['Chat Interface', 'Local Models', 'User Management'],
        'tags': ['Chatbot', 'UI', 'Open Source']
    },
    {
        'name': 'FastGPT', 'category': 'Repository', 'description': 'Open-source platform for building AI knowledge bases and chatbots.',
        'website': 'https://fastgpt.io', 'pricing': 'Free/Open Source',
        'features': ['Knowledge Base', 'Chatbots', 'RAG'],
        'tags': ['Chatbot', 'Knowledge Base', 'Open Source']
    },
    {
        'name': 'Continue', 'category': 'Repository', 'description': 'Open-source AI coding assistant for VS Code and JetBrains IDEs.',
        'website': 'https://continue.dev', 'pricing': 'Free/Open Source',
        'features': ['Code Completion', 'Chat', 'IDE Integration'],
        'tags': ['Coding', 'IDE', 'Open Source']
    },
    {
        'name': 'Dify', 'category': 'Repository', 'description': 'Open-source platform for building AI applications and agents.',
        'website': 'https://dify.ai', 'pricing': 'Free/Open Source',
        'features': ['AI Apps', 'Agents', 'Workflows'],
        'tags': ['Low-Code', 'Agents', 'Open Source']
    },
    {
        'name': 'SuperAGI', 'category': 'Repository', 'description': 'Framework for creating autonomous AI agents and agent swarms.',
        'website': 'https://superagi.com', 'pricing': 'Free/Open Source',
        'features': ['Autonomous Agents', 'Agent Swarms', 'Automation'],
        'tags': ['Agents', 'Automation', 'Open Source']
    },
    {
        'name': 'AgentOps', 'category': 'Repository', 'description': 'Developer platform for monitoring, testing, and debugging AI agents.',
        'website': 'https://agentops.ai', 'pricing': 'Freemium',
        'features': ['Observability', 'Monitoring', 'Debugging'],
        'tags': ['Agents', 'Developer Tools', 'Monitoring']
    },
    {
        'name': 'Mem0', 'category': 'Repository', 'description': 'Open-source memory layer for AI agents and applications.',
        'website': 'https://mem0.ai', 'pricing': 'Free/Open Source',
        'features': ['Memory Management', 'Personalization', 'Context Retention'],
        'tags': ['Memory', 'Agents', 'LLM']
    },
    # Chatbots
    {
        'name': 'ChatGPT', 'category': 'Chatbots', 'description': 'AI chatbot for conversation, writing, coding, research, and productivity tasks.',
        'website': 'https://chatgpt.com', 'pricing': 'Freemium',
        'features': ['Conversational AI', 'Writing', 'Coding Assistance'],
        'tags': ['Chatbot', 'AI Assistant', 'Productivity']
    },
    {
        'name': 'Claude', 'category': 'Chatbots', 'description': 'AI assistant optimized for reasoning, writing, document analysis, and long conversations.',
        'website': 'https://claude.ai', 'pricing': 'Freemium',
        'features': ['Reasoning', 'Document Analysis', 'Long Context'],
        'tags': ['Chatbot', 'AI Assistant', 'Research']
    },
    {
        'name': 'Gemini', 'category': 'Chatbots', 'description': "Google's multimodal AI assistant for search, productivity, coding, and research.",
        'website': 'https://gemini.google.com', 'pricing': 'Freemium',
        'features': ['Multimodal AI', 'Research', 'Google Integration'],
        'tags': ['Chatbot', 'Google AI', 'Assistant']
    },
    {
        'name': 'Microsoft Copilot', 'category': 'Chatbots', 'description': 'AI assistant integrated with Microsoft products and web search capabilities.',
        'website': 'https://copilot.microsoft.com', 'pricing': 'Freemium',
        'features': ['Web Search', 'Microsoft 365', 'AI Chat'],
        'tags': ['Chatbot', 'Microsoft', 'Productivity']
    },
    {
        'name': 'Perplexity', 'category': 'Chatbots', 'description': 'AI answer engine that combines chatbot conversations with web search and citations.',
        'website': 'https://www.perplexity.ai', 'pricing': 'Freemium',
        'features': ['AI Search', 'Citations', 'Research'],
        'tags': ['Chatbot', 'Search', 'Research']
    },
    {
        'name': 'Grok', 'category': 'Chatbots', 'description': 'AI chatbot developed by xAI with real-time information and reasoning capabilities.',
        'website': 'https://grok.com', 'pricing': 'Paid',
        'features': ['Real-Time Information', 'Reasoning', 'AI Chat'],
        'tags': ['Chatbot', 'xAI', 'Assistant']
    },
    {
        'name': 'Pi', 'category': 'Chatbots', 'description': 'Personal AI chatbot designed for friendly conversations and emotional intelligence.',
        'website': 'https://pi.ai', 'pricing': 'Free',
        'features': ['Personal Assistant', 'Conversation', 'Emotional Intelligence'],
        'tags': ['Chatbot', 'Personal AI', 'Assistant']
    },
    {
        'name': 'Poe', 'category': 'Chatbots', 'description': 'Platform that provides access to multiple AI chatbots and models in one place.',
        'website': 'https://poe.com', 'pricing': 'Freemium',
        'features': ['Multiple Models', 'Custom Bots', 'AI Chat'],
        'tags': ['Chatbot', 'AI Platform', 'Multi-Model']
    },
    {
        'name': 'YouChat', 'category': 'Chatbots', 'description': 'Conversational AI assistant integrated into the You.com search platform.',
        'website': 'https://you.com', 'pricing': 'Freemium',
        'features': ['AI Search', 'Chat Assistant', 'Research'],
        'tags': ['Chatbot', 'Search', 'AI Assistant']
    },
    {
        'name': 'Character.AI', 'category': 'Chatbots', 'description': 'Platform for chatting with AI characters and creating custom conversational agents.',
        'website': 'https://character.ai', 'pricing': 'Freemium',
        'features': ['Custom Characters', 'Roleplay', 'AI Conversations'],
        'tags': ['Chatbot', 'Characters', 'Entertainment']
    },
    # AI Search Engines
    {
        'name': 'Perplexity', 'category': 'AI Search Engines', 'description': 'AI-powered answer engine that combines web search with conversational responses and source citations.',
        'website': 'https://www.perplexity.ai', 'pricing': 'Freemium',
        'features': ['AI Search', 'Source Citations', 'Deep Research'],
        'tags': ['Search Engine', 'Research', 'AI Assistant']
    },
    {
        'name': 'You.com', 'category': 'AI Search Engines', 'description': 'AI search platform combining web search, chat, productivity tools, and AI agents.',
        'website': 'https://you.com', 'pricing': 'Freemium',
        'features': ['AI Search', 'AI Chat', 'Productivity Tools'],
        'tags': ['Search Engine', 'AI Assistant', 'Research']
    },
    {
        'name': 'Google AI Mode', 'category': 'AI Search Engines', 'description': "Google's AI-powered search experience providing conversational answers and web results.",
        'website': 'https://www.google.com', 'pricing': 'Free',
        'features': ['AI Answers', 'Web Search', 'Multimodal Search'],
        'tags': ['Search Engine', 'Google', 'AI Search']
    },
    {
        'name': 'Microsoft Copilot Search', 'category': 'AI Search Engines', 'description': "AI-enhanced search experience powered by Microsoft's Copilot and Bing technologies.",
        'website': 'https://copilot.microsoft.com', 'pricing': 'Free',
        'features': ['AI Search', 'Web Results', 'Conversational Answers'],
        'tags': ['Search Engine', 'Microsoft', 'AI Assistant']
    },
    {
        'name': 'Andi', 'category': 'AI Search Engines', 'description': 'Conversational AI search engine designed to provide direct answers instead of traditional links.',
        'website': 'https://andisearch.com', 'pricing': 'Free',
        'features': ['Conversational Search', 'Direct Answers', 'Research'],
        'tags': ['Search Engine', 'AI Chat', 'Research']
    },
    {
        'name': 'Phind', 'category': 'AI Search Engines', 'description': 'AI search engine optimized for developers, programming questions, and technical research.',
        'website': 'https://www.phind.com', 'pricing': 'Freemium',
        'features': ['Developer Search', 'Code Answers', 'Technical Research'],
        'tags': ['Search Engine', 'Coding', 'Developers']
    },
    {
        'name': 'Komo', 'category': 'AI Search Engines', 'description': 'AI-powered search platform focused on fast answers, summaries, and knowledge discovery.',
        'website': 'https://komo.ai', 'pricing': 'Freemium',
        'features': ['AI Search', 'Knowledge Discovery', 'Summaries'],
        'tags': ['Search Engine', 'Research', 'AI']
    },
    {
        'name': 'Brave Search AI', 'category': 'AI Search Engines', 'description': 'Privacy-focused search engine with integrated AI answer generation and summarization.',
        'website': 'https://search.brave.com', 'pricing': 'Free',
        'features': ['Privacy Search', 'AI Answers', 'Summarization'],
        'tags': ['Search Engine', 'Privacy', 'AI Search']
    },
    {
        'name': 'Exa', 'category': 'AI Search Engines', 'description': 'Search engine built specifically for AI applications and semantic web search.',
        'website': 'https://exa.ai', 'pricing': 'Freemium',
        'features': ['Semantic Search', 'AI API', 'Web Discovery'],
        'tags': ['Search Engine', 'Developers', 'API']
    },
    {
        'name': 'Genspark', 'category': 'AI Search Engines', 'description': 'AI-native search platform that creates structured research pages from web information.',
        'website': 'https://www.genspark.ai', 'pricing': 'Freemium',
        'features': ['Research Pages', 'AI Search', 'Information Synthesis'],
        'tags': ['Search Engine', 'Research', 'Knowledge Discovery']
    },
    # LLM
    {
        'name': 'GPT-5.5', 'category': 'LLM', 'description': "OpenAI's advanced multimodal large language model for reasoning, coding, writing, and AI assistants.",
        'website': 'https://openai.com', 'pricing': 'Paid API',
        'features': ['Reasoning', 'Coding', 'Multimodal'],
        'tags': ['LLM', 'OpenAI', 'Foundation Model']
    },
    {
        'name': 'GPT-4.1', 'category': 'LLM', 'description': 'OpenAI large language model optimized for coding, instruction following, and enterprise applications.',
        'website': 'https://openai.com', 'pricing': 'Paid API',
        'features': ['Coding', 'Reasoning', 'Function Calling'],
        'tags': ['LLM', 'OpenAI', 'AI Model']
    },
    {
        'name': 'Claude Opus', 'category': 'LLM', 'description': "Anthropic's flagship reasoning model for complex analysis and enterprise workloads.",
        'website': 'https://claude.ai', 'pricing': 'Paid API',
        'features': ['Reasoning', 'Long Context', 'Analysis'],
        'tags': ['LLM', 'Anthropic', 'Reasoning']
    },
    {
        'name': 'Claude Sonnet', 'category': 'LLM', 'description': 'Balanced Anthropic model offering strong performance for coding, writing, and reasoning.',
        'website': 'https://claude.ai', 'pricing': 'Paid API',
        'features': ['Coding', 'Reasoning', 'Writing'],
        'tags': ['LLM', 'Anthropic', 'AI Assistant']
    },
    {
        'name': 'Gemini 2.5 Pro', 'category': 'LLM', 'description': "Google's flagship multimodal model for advanced reasoning and long-context tasks.",
        'website': 'https://gemini.google.com', 'pricing': 'Paid API',
        'features': ['Multimodal', 'Reasoning', 'Long Context'],
        'tags': ['LLM', 'Google', 'Foundation Model']
    },
    {
        'name': 'Gemini 2.5 Flash', 'category': 'LLM', 'description': 'Fast and cost-efficient Gemini model optimized for large-scale AI applications.',
        'website': 'https://gemini.google.com', 'pricing': 'Paid API',
        'features': ['Fast Inference', 'Multimodal', 'Low Cost'],
        'tags': ['LLM', 'Google', 'Inference']
    },
    {
        'name': 'Grok', 'category': 'LLM', 'description': 'Large language model developed by xAI with strong reasoning and real-time information capabilities.',
        'website': 'https://grok.com', 'pricing': 'Paid',
        'features': ['Reasoning', 'Real-Time Information', 'Coding'],
        'tags': ['LLM', 'xAI', 'AI Assistant']
    },
    {
        'name': 'Command R+', 'category': 'LLM', 'description': 'Enterprise-focused language model from Cohere designed for RAG and business applications.',
        'website': 'https://cohere.com', 'pricing': 'Paid API',
        'features': ['RAG', 'Enterprise AI', 'Long Context'],
        'tags': ['LLM', 'Cohere', 'Enterprise']
    },
    {
        'name': 'Mistral Large', 'category': 'LLM', 'description': 'Flagship language model from Mistral AI optimized for reasoning and multilingual tasks.',
        'website': 'https://mistral.ai', 'pricing': 'Paid API',
        'features': ['Reasoning', 'Multilingual', 'Coding'],
        'tags': ['LLM', 'Mistral', 'Foundation Model']
    },
    {
        'name': 'AI21 Jamba', 'category': 'LLM', 'description': 'Hybrid state-space and transformer model optimized for long-context enterprise workloads.',
        'website': 'https://www.ai21.com', 'pricing': 'Paid API',
        'features': ['Long Context', 'Enterprise AI', 'Reasoning'],
        'tags': ['LLM', 'AI21', 'Enterprise']
    },
    {
        'name': 'Llama', 'category': 'LLM', 'description': 'Open-weight language model family developed by Meta for research and production use.',
        'website': 'https://www.llama.com', 'pricing': 'Free/Open Weights',
        'features': ['Open Weights', 'Reasoning', 'Fine-Tuning'],
        'tags': ['LLM', 'Meta', 'Open Source']
    },
    {
        'name': 'DeepSeek R1', 'category': 'LLM', 'description': 'Reasoning-focused open model designed for mathematics, coding, and analytical tasks.',
        'website': 'https://www.deepseek.com', 'pricing': 'Open Weights',
        'features': ['Reasoning', 'Math', 'Coding'],
        'tags': ['LLM', 'DeepSeek', 'Reasoning']
    },
    {
        'name': 'DeepSeek V3', 'category': 'LLM', 'description': 'General-purpose large language model from DeepSeek with strong coding and reasoning performance.',
        'website': 'https://www.deepseek.com', 'pricing': 'Open Weights',
        'features': ['Coding', 'Reasoning', 'Chat'],
        'tags': ['LLM', 'DeepSeek', 'Foundation Model']
    },
    {
        'name': 'Qwen', 'category': 'LLM', 'description': "Alibaba's family of multilingual large language models for general AI applications.",
        'website': 'https://qwenlm.github.io', 'pricing': 'Open Weights',
        'features': ['Multilingual', 'Reasoning', 'Coding'],
        'tags': ['LLM', 'Alibaba', 'Open Source']
    },
    {
        'name': 'Mixtral', 'category': 'LLM', 'description': 'Mixture-of-experts model from Mistral AI providing efficient high-performance inference.',
        'website': 'https://mistral.ai', 'pricing': 'Open Weights',
        'features': ['MoE Architecture', 'Efficiency', 'Reasoning'],
        'tags': ['LLM', 'Mistral', 'MoE']
    },
    {
        'name': 'Phi', 'category': 'LLM', 'description': 'Compact language model family from Microsoft optimized for efficiency and reasoning.',
        'website': 'https://www.microsoft.com', 'pricing': 'Open Weights',
        'features': ['Small Models', 'Reasoning', 'Efficiency'],
        'tags': ['LLM', 'Microsoft', 'SLM']
    },
    {
        'name': 'Gemma', 'category': 'LLM', 'description': "Google's open-weight language model family built from Gemini research.",
        'website': 'https://ai.google.dev/gemma', 'pricing': 'Open Weights',
        'features': ['Open Models', 'Fine-Tuning', 'Multilingual'],
        'tags': ['LLM', 'Google', 'Open Source']
    },
    {
        'name': 'Falcon', 'category': 'LLM', 'description': 'Open-weight large language model developed by the Technology Innovation Institute.',
        'website': 'https://falconllm.tii.ae', 'pricing': 'Open Weights',
        'features': ['Open Models', 'Reasoning', 'Research'],
        'tags': ['LLM', 'Falcon', 'Open Source']
    },
    {
        'name': 'Yi', 'category': 'LLM', 'description': 'High-performance multilingual language model family developed by 01.AI.',
        'website': 'https://www.01.ai', 'pricing': 'Open Weights',
        'features': ['Multilingual', 'Reasoning', 'Chat'],
        'tags': ['LLM', '01.AI', 'Open Source']
    },
    {
        'name': 'MPT', 'category': 'LLM', 'description': 'Open-source transformer model family from MosaicML for enterprise AI applications.',
        'website': 'https://www.databricks.com', 'pricing': 'Open Weights',
        'features': ['Custom Training', 'Enterprise AI', 'Open Source'],
        'tags': ['LLM', 'MosaicML', 'Open Source']
    },
    {
        'name': 'DeepSeek Coder', 'category': 'LLM', 'description': 'Code-focused language model specialized for software development tasks.',
        'website': 'https://www.deepseek.com', 'pricing': 'Open Weights',
        'features': ['Code Generation', 'Programming', 'Debugging'],
        'tags': ['Coding LLM', 'DeepSeek', 'Developer']
    },
    {
        'name': 'Qwen Coder', 'category': 'LLM', 'description': "Alibaba's code-specialized model for programming and software engineering workflows.",
        'website': 'https://qwenlm.github.io', 'pricing': 'Open Weights',
        'features': ['Code Completion', 'Programming', 'Reasoning'],
        'tags': ['Coding LLM', 'Qwen', 'Developer']
    },
    {
        'name': 'Codestral', 'category': 'LLM', 'description': "Mistral AI's coding-focused language model for software development and automation.",
        'website': 'https://mistral.ai', 'pricing': 'Paid API',
        'features': ['Code Generation', 'Code Completion', 'Developer Tools'],
        'tags': ['Coding LLM', 'Mistral', 'Programming']
    },
    {
        'name': 'StarCoder2', 'category': 'LLM', 'description': 'Open-source code generation model developed for software engineering tasks.',
        'website': 'https://huggingface.co/bigcode', 'pricing': 'Open Weights',
        'features': ['Code Generation', 'Multiple Languages', 'Open Source'],
        'tags': ['Coding LLM', 'BigCode', 'Open Source']
    },
    {
        'name': 'Code Llama', 'category': 'LLM', 'description': "Meta's code-specialized large language model for programming and debugging.",
        'website': 'https://www.llama.com', 'pricing': 'Open Weights',
        'features': ['Code Generation', 'Debugging', 'Programming'],
        'tags': ['Coding LLM', 'Meta', 'Developer']
    },
    {
        'name': 'Qwen-VL', 'category': 'LLM', 'description': 'Vision-language model from Alibaba capable of understanding images and text together.',
        'website': 'https://qwenlm.github.io', 'pricing': 'Open Weights',
        'features': ['Vision Understanding', 'Multimodal', 'Image Analysis'],
        'tags': ['Vision Model', 'Multimodal', 'Qwen']
    },
    {
        'name': 'LLaVA', 'category': 'LLM', 'description': 'Open-source multimodal model combining visual understanding with language reasoning.',
        'website': 'https://llava-vl.github.io', 'pricing': 'Open Source',
        'features': ['Vision-Language', 'Image Understanding', 'Multimodal'],
        'tags': ['Vision Model', 'Multimodal', 'Open Source']
    },
]

path = Path('src/utils/tools_enriched.json')
with path.open('r', encoding='utf-8') as f:
    existing_tools = json.load(f)

match_by_lower = {t['name'].lower(): t for t in existing_tools}
updated = 0
inserted = 0
fixed_names = 0

# merge duplicates into desired data by name, preserving categories and metadata
merged = OrderedDict()
for entry in DATA:
    key = entry['name']
    if key not in merged:
        merged[key] = {
            **entry,
            'categories': [entry['category']]
        }
    else:
        item = merged[key]
        if entry['category'] not in item['categories']:
            item['categories'].append(entry['category'])
        # merge tags/features without duplicates
        item['features'] = list(dict.fromkeys(item['features'] + entry.get('features', [])))
        item['tags'] = list(dict.fromkeys(item['tags'] + entry.get('tags', [])))
        # keep the first description, website, pricing if unchanged

for name, desired in merged.items():
    lower = name.lower()
    existing = match_by_lower.get(lower)
    if existing:
        changed = False
        # correct case-sensitive name if needed
        if existing['name'] != name:
            existing['name'] = name
            changed = True
            fixed_names += 1

        # set primary category to first desired category
        if existing.get('category') != desired['category']:
            existing['category'] = desired['category']
            changed = True

        # categories array
        if existing.get('categories') != desired['categories']:
            existing['categories'] = desired['categories']
            changed = True

        # update fields to user-provided metadata
        if existing.get('description') != desired['description']:
            existing['description'] = desired['description']
            existing['shortDescription'] = desired['description']
            changed = True
        if existing.get('shortDescription') != desired['description']:
            existing['shortDescription'] = desired['description']
            changed = True
        if existing.get('links', {}).get('website') != desired['website']:
            existing.setdefault('links', {})['website'] = desired['website']
            changed = True
        desired_pricing = normalize_pricing_value(desired['pricing'])
        if existing.get('pricing', {}).get('model') != desired_pricing:
            existing.setdefault('pricing', {})['model'] = desired_pricing
            changed = True
        if existing.get('features') != desired['features']:
            existing['features'] = desired['features']
            changed = True
        if existing.get('tags') != desired['tags']:
            existing['tags'] = desired['tags']
            changed = True
        if existing.get('slug') != (existing.get('slug') or desired['name'].lower().replace(' ', '-').replace('.', '').replace('·','')):
            existing['slug'] = existing.get('slug') or desired['name'].lower().replace(' ', '-').replace('.', '').replace('·','')
        if changed:
            updated += 1
    else:
        new_tool = {
            'name': name,
            'slug': name.lower().replace(' ', '-').replace('.', '').replace('·',''),
            'category': desired['category'],
            'categories': desired['categories'],
            'shortDescription': desired['description'],
            'description': desired['description'],
            'pricing': {'model': normalize_pricing_value(desired['pricing'])},
            'links': {'website': desired['website']},
            'tags': desired['tags'],
            'features': desired['features'],
            'source': 'manual',
            'status': 'approved',
            'stats': {'rating': 0, 'ratingCount': 0, 'views': 0, 'weeklyViews': 0},
            'aiMeta': {'useCases': [], 'summary': ''}
        }
        existing_tools.append(new_tool)
        match_by_lower[lower] = new_tool
        inserted += 1

with path.open('w', encoding='utf-8') as f:
    json.dump(existing_tools, f, indent=2, ensure_ascii=False)

print(f'updated={updated}, inserted={inserted}, fixed_names={fixed_names}')
