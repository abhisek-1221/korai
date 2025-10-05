Implement the 2nd feature to generate viral shorts from the identified clips.

Workflow -> for each video there are multiple indetified clips -> Add a select button on each clip on LHS the dashboard/clip/video/[id] page -> Add Generate Shorts Button (enabled if clips are selected) -> A config modal should open with option of target language(default None) and aspect ratio option (1:1, 16:9,9:16 (default) )-> Generate Clips Button on the Modal -> send the selected clips to the /process clip backend endpoint via inngest function. 

Backend API is deployed on https://abhisek-1221--jif-aipodcastclipper-process-clips.modal.run/

Send this payload to the endpoint:
{
    "s3_key": "youtube-videos/0ad007c8-00da-4a44-95ec-9b7dc3ef284b",
    "clips": [{"start": 125.007, "end": 221.043}],
    "prompt": "",
    "target_language": null,
    "aspect_ratio": "9:16",
    "subtitles": true,
            "subtitle_customization": {
            "enabled": true,
            "position": "middle",  
            "font_size": 120, 
            "font_family": "Anton",
            "font_color": "#FFFFFF", 
            "outline_color": "#000000",
            "outline_width": 2.5,
            "background_color": null, 
            "background_opacity": 0.0,
            "shadow_enabled": true,
            "shadow_color": "#808080",  
            "shadow_offset": 3.0,
            "max_words_per_line": 3,
            "margin_horizontal": 60,
            "margin_vertical": 180,
            "fade_in_duration": 0,  
            "fade_out_duration": 0 ,
            "karaoke_enabled": true,
            "karaoke_highlight_color": "#0DE050",
            "karaoke_popup_scale": 1.25
        }
}

Take the s3 key from that particular videoid (s3 path of stored video). The clips contains the array of start and end, these are basically the selected clips timestamps which should go in payload. target language keep None/null by default and aspect ration taken from fronted, subtitles keep as it is in the payload by default no change or user option for subtitles in configuration modal.

Response:
{
    "processed_clips": [
        {
            "start": 125.007,
            "end": 221.043,
            "s3_key": "youtube-videos/clip_0.mp4"
        }
    ]
}

store the processed clips as exported clips in db as inggest step function and display it exported tab of that particular video[id] page in dashboard.

Modify the db schema in such way that exported clips data are basically children with respect to the parent video.
