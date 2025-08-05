import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';

// Enhanced error logging for authentication operations
const logAuthError = (operation, error, context = {}) => {
  const errorDetails = {
    operation,
    timestamp: new Date().toISOString(),
    errorName: error?.name || 'Unknown',
    errorMessage: error?.message || 'No message',
    errorCode: error?.code || 'no-code',
    errorStack: error?.stack,
    context,
    userAgent: navigator.userAgent,
    hasAuth: !!auth,
    authConfig: auth?.config ? 'present' : 'missing'
  };

  console.error(`❌ Auth service error in ${operation}:`, errorDetails);
  return errorDetails;
};

// Enhanced input validation utilities
const validateEmail = (email) => {
  const errors = [];
  
  if (!email) {
    errors.push('Email is required');
    return errors;
  }
  
  if (typeof email !== 'string') {
    errors.push(`Email must be a string, got ${typeof email}`);
    return errors;
  }
  
  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    errors.push('Email cannot be empty or only whitespace');
    return errors;
  }
  
  if (trimmedEmail.length > 254) {
    errors.push(`Email too long: ${trimmedEmail.length} characters. Maximum 254 characters allowed.`);
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    errors.push('Email format is invalid');
  }
  
  return errors;
};

const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return errors;
  }
  
  if (typeof password !== 'string') {
    errors.push(`Password must be a string, got ${typeof password}`);
    return errors;
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push(`Password too long: ${password.length} characters. Maximum 128 characters allowed.`);
  }
  
  return errors;
};

export const authService = {
  async register(email, password) {
    const operation = 'register';
    console.log(`👤 Starting ${operation}:`, { 
      hasEmail: !!email, 
      emailLength: email?.length || 0,
      hasPassword: !!password,
      passwordLength: password?.length || 0
    });

    try {
      // Input validation
      const emailErrors = validateEmail(email);
      const passwordErrors = validatePassword(password);
      const allErrors = [...emailErrors, ...passwordErrors];
      
      if (allErrors.length > 0) {
        throw new Error(`Validation failed: ${allErrors.join(', ')}`);
      }

      // Sanitize inputs
      const sanitizedEmail = email.trim().toLowerCase();
      
      console.log(`📧 ${operation} with sanitized email:`, { 
        originalLength: email.length,
        sanitizedLength: sanitizedEmail.length,
        emailDomain: sanitizedEmail.split('@')[1] || 'unknown'
      });

      // Check if auth is properly initialized
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      
      if (!userCredential || !userCredential.user) {
        throw new Error('User registration succeeded but no user object returned');
      }

      console.log(`✅ ${operation} completed successfully:`, {
        userId: userCredential.user.uid,
        userEmail: userCredential.user.email,
        emailVerified: userCredential.user.emailVerified,
        hasDisplayName: !!userCredential.user.displayName
      });

      return userCredential.user;

    } catch (error) {
      const errorContext = {
        hasEmail: !!email,
        emailValid: email && validateEmail(email).length === 0,
        hasPassword: !!password,
        passwordValid: password && validatePassword(password).length === 0
      };
      
      logAuthError(operation, error, errorContext);
      
      // Enhance error messages for better user experience
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please sign in instead.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  },

  async login(email, password) {
    const operation = 'login';
    console.log(`🔐 Starting ${operation}:`, { 
      hasEmail: !!email, 
      emailLength: email?.length || 0,
      hasPassword: !!password,
      passwordLength: password?.length || 0
    });

    try {
      // Input validation
      const emailErrors = validateEmail(email);
      const passwordErrors = validatePassword(password);
      const allErrors = [...emailErrors, ...passwordErrors];
      
      if (allErrors.length > 0) {
        throw new Error(`Validation failed: ${allErrors.join(', ')}`);
      }

      // Sanitize inputs
      const sanitizedEmail = email.trim().toLowerCase();
      
      console.log(`📧 ${operation} with sanitized email:`, { 
        originalLength: email.length,
        sanitizedLength: sanitizedEmail.length,
        emailDomain: sanitizedEmail.split('@')[1] || 'unknown'
      });

      // Check if auth is properly initialized
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }

      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
      
      if (!userCredential || !userCredential.user) {
        throw new Error('User login succeeded but no user object returned');
      }

      console.log(`✅ ${operation} completed successfully:`, {
        userId: userCredential.user.uid,
        userEmail: userCredential.user.email,
        emailVerified: userCredential.user.emailVerified,
        lastSignInTime: userCredential.user.metadata?.lastSignInTime,
        hasDisplayName: !!userCredential.user.displayName
      });

      return userCredential.user;

    } catch (error) {
      const errorContext = {
        hasEmail: !!email,
        emailValid: email && validateEmail(email).length === 0,
        hasPassword: !!password,
        passwordValid: password && validatePassword(password).length === 0
      };
      
      logAuthError(operation, error, errorContext);
      
      // Enhance error messages for better user experience
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address. Please register first.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  },

  async loginWithGoogle() {
    const operation = 'loginWithGoogle';
    console.log(`🔍 Starting ${operation}`);

    try {
      // Check if auth is properly initialized
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }

      const provider = new GoogleAuthProvider();
      
      // Configure provider for better user experience
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log(`🔗 ${operation} provider configured:`, {
        providerId: provider.providerId,
        scopes: provider.getScopes ? provider.getScopes() : 'unknown'
      });

      const result = await signInWithPopup(auth, provider);
      
      if (!result || !result.user) {
        throw new Error('Google login succeeded but no user object returned');
      }

      // Extract additional Google-specific information
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      console.log(`✅ ${operation} completed successfully:`, {
        userId: result.user.uid,
        userEmail: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
        hasCredential: !!credential,
        accessToken: credential?.accessToken ? 'present' : 'missing'
      });

      return result.user;

    } catch (error) {
      const errorContext = {
        errorCode: error.code,
        hasCustomData: !!error.customData,
        hasCredential: !!error.credential
      };
      
      logAuthError(operation, error, errorContext);
      
      // Enhance error messages for better user experience
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Please allow popups and try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Another Google sign-in is already in progress.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error during Google sign-in. Please check your connection.');
      } else if (error.code === 'auth/internal-error') {
        throw new Error('Internal error during Google sign-in. Please try again.');
      }
      
      throw error;
    }
  },

  async logout() {
    const operation = 'logout';
    console.log(`🚪 Starting ${operation}:`, {
      hasCurrentUser: !!auth?.currentUser,
      currentUserId: auth?.currentUser?.uid || 'none'
    });

    try {
      // Check if auth is properly initialized
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }

      await signOut(auth);
      
      console.log(`✅ ${operation} completed successfully`);

    } catch (error) {
      const errorContext = {
        hadCurrentUser: !!auth?.currentUser,
        authState: auth ? 'initialized' : 'not-initialized'
      };
      
      logAuthError(operation, error, errorContext);
      
      // Enhance error messages
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error during logout. You may already be logged out.');
      }
      
      throw error;
    }
  },

  async resetPassword(email) {
    const operation = 'resetPassword';
    console.log(`🔄 Starting ${operation}:`, { 
      hasEmail: !!email, 
      emailLength: email?.length || 0
    });

    try {
      // Input validation
      const emailErrors = validateEmail(email);
      if (emailErrors.length > 0) {
        throw new Error(`Email validation failed: ${emailErrors.join(', ')}`);
      }

      // Sanitize email
      const sanitizedEmail = email.trim().toLowerCase();
      
      console.log(`📧 ${operation} with sanitized email:`, { 
        originalLength: email.length,
        sanitizedLength: sanitizedEmail.length,
        emailDomain: sanitizedEmail.split('@')[1] || 'unknown'
      });

      // Check if auth is properly initialized
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }

      await sendPasswordResetEmail(auth, sanitizedEmail);
      
      console.log(`✅ ${operation} completed successfully:`, {
        emailSent: true,
        targetEmail: sanitizedEmail
      });

    } catch (error) {
      const errorContext = {
        hasEmail: !!email,
        emailValid: email && validateEmail(email).length === 0
      };
      
      logAuthError(operation, error, errorContext);
      
      // Enhance error messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many password reset requests. Please try again later.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  },

  getCurrentUser() {
    const operation = 'getCurrentUser';
    try {
      if (!auth) {
        console.warn(`⚠️ ${operation}: Firebase auth is not initialized`);
        return null;
      }

      const currentUser = auth.currentUser;
      
      console.log(`✅ ${operation} completed:`, {
        hasUser: !!currentUser,
        userId: currentUser?.uid || 'none',
        userEmail: currentUser?.email || 'none',
        emailVerified: currentUser?.emailVerified || false
      });

      return currentUser;

    } catch (error) {
      logAuthError(operation, error, {
        authState: auth ? 'initialized' : 'not-initialized'
      });
      return null;
    }
  },

  onAuthStateChanged(callback) {
    const operation = 'onAuthStateChanged';
    try {
      if (!auth) {
        const error = new Error('Firebase auth is not initialized');
        logAuthError(operation, error, { hasCallback: typeof callback === 'function' });
        throw error;
      }

      if (typeof callback !== 'function') {
        const error = new Error(`Callback must be a function, got ${typeof callback}`);
        logAuthError(operation, error, { callbackType: typeof callback });
        throw error;
      }

      console.log(`👁️ ${operation} listener attached`);

      // Wrap callback with error handling
      const wrappedCallback = (user) => {
        try {
          console.log(`🔄 Auth state changed:`, {
            timestamp: new Date().toISOString(),
            hasUser: !!user,
            userId: user?.uid || 'none',
            userEmail: user?.email || 'none'
          });
          
          callback(user);
        } catch (callbackError) {
          logAuthError(`${operation}-callback`, callbackError, {
            hasUser: !!user,
            userId: user?.uid || 'none'
          });
        }
      };

      return auth.onAuthStateChanged(wrappedCallback);

    } catch (error) {
      logAuthError(operation, error, {
        hasCallback: typeof callback === 'function',
        authState: auth ? 'initialized' : 'not-initialized'
      });
      throw error;
    }
  }
};