# INST377_Final_Project
Title: Fantasy Football Start/Sit Calculator
Description: Tool intedned to be used by fantasy football players to make tough start/sit decisions easier.
Target browsers: IOS and Android.


Developer Manual:
    - Installation:
        This app may be installed from vercel as a PWA (progressive web app). You can run this app on vercel at [VERCEL LINK]. 
        You must sign up for a free account to get an API key on the Tank01 API website as the current key is most likely expired. 
        You're key can be inserted in the start-sit.js file on the first line as a replacement for the current one. 

    This app writes to a supabase database found at https://supabase.com/dashboard/project/rgsmaqqmagqqdpkipist. It logs all comparisons
    and can be used in the future to find most common start/sit questions and other relevant information. 

    There are no known bugs right now but some could arise if there are changes to the tank01 API or it's data formatting. Future development
    should include more factors in the decision process like injury status, next opponent's defensive rating, and their team's offensive ranking. 
        
