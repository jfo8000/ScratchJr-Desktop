
let currentUsage;

//  upgraded to local storage from the original cookie implementation

export default class AppUsage {
    static get currentUsage () {
        return currentUsage;
    }
    
    /**
     * Initialize currentUsage for attaching to Analytics events from
     * the usage cookie if it is set. currentUsage is blank if the cookie is
     * not set.
     */
    static initUsage () {
      currentUsage = window.localStorage.appUsage;
    }
    
    /**
     * Check whether the App should ask for the usage data (first time launched)
     * @return {boolean} True if the usage cookie has never been set
     */
    static askForUsage () {
      	
        return window.localStorage.appUsage === undefined;
    }
    
    /**
     * Set the usage cookie for tracking Analytics Events
     * @param {string} kind answer from user to the usage survey (home, school, other, noanswer)
     */
    static setUsage (kind) {
        if (kind === '') {
           kind = 'noanswer';
            
        }
        window.localStorage.appUsage = kind;
        
        currentUsage = (kind === '') ? 'noanswer::' : kind + '::';
    }
}
